<?php

namespace App\Services\Sales;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesPayment;
use App\Models\User;
use App\Services\Inventory\StockServiceInterface;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesService
{
    public function __construct(
        protected StockServiceInterface $stockService,
        protected CashRegisterService $cashRegisterService
    ) {}

    /**
     * Generate unique, non-duplicable invoice number:
     * Format: INV-{BRANCH_CODE}-{YYYYMMDD}-{0001}
     */
    public function generateInvoiceNumber(Branch $branch, ?Carbon $date = null): string
    {
        $date = $date ?? now();
        $dateStr = $date->format('Ymd');
        $prefix = "INV-{$branch->branch_code}-{$dateStr}-";

        // Find last invoice for this branch and date
        $latest = SalesOrder::withTrashed()
            ->where('branch_id', $branch->id)
            ->where('invoice_number', 'LIKE', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->value('invoice_number');

        if ($latest) {
            $lastSeq = (int) substr($latest, strrpos($latest, '-') + 1);
            $seq = $lastSeq + 1;
        } else {
            $seq = 1;
        }

        // Ensure collision-proof sequence even under concurrent checkout
        $candidate = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        while (SalesOrder::withTrashed()->where('invoice_number', $candidate)->exists()) {
            $seq++;
            $candidate = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    /**
     * Create a complete, validated sales transaction.
     */
    public function createSale(array $data, User $user, Branch $branch): SalesOrder
    {
        $branchId = $branch->id;

        // Idempotency check: prevent duplicate submissions under network retries
        $idempotencyKey = $data['idempotency_key'] ?? $data['client_reference'] ?? null;
        if ($idempotencyKey) {
            $existing = SalesOrder::with(['customer', 'items.product', 'items.variant', 'payments', 'user', 'branch'])
                ->where('branch_id', $branchId)
                ->where('metadata->idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        $itemsData = $data['items'] ?? [];
        if (empty($itemsData)) {
            throw ValidationException::withMessages([
                'items' => ['Cart cannot be empty. Please add at least one product.']
            ]);
        }

        // Permission check for discounts
        $hasDiscountPermission = $user->hasPermission('pos.discount', $branchId);
        $billDiscountType = $data['discount_type'] ?? null;
        $billDiscountRate = isset($data['discount_rate']) ? (float) $data['discount_rate'] : 0.0;
        $billDiscountAmountInput = isset($data['discount_amount']) ? (float) $data['discount_amount'] : 0.0;

        // Verify customer and resolve customer group discount if configured
        $customer = null;
        $customerId = !empty($data['customer_id']) ? (int) $data['customer_id'] : null;
        if ($customerId) {
            $customer = Customer::with('group')->where('id', $customerId)->where('is_active', true)->first();
            if (!$customer) {
                throw ValidationException::withMessages([
                    'customer_id' => ['Selected customer is invalid or inactive.']
                ]);
            }

            // If no manual bill discount was provided, auto-apply customer group discount
            if ($billDiscountRate <= 0 && $billDiscountAmountInput <= 0 && $customer->group && $customer->group->is_active && (float) $customer->group->discount_percentage > 0) {
                $billDiscountType = 'percentage';
                $billDiscountRate = (float) $customer->group->discount_percentage;
            }
        }

        $isCustomerGroupDiscount = ($customer?->group && (float) $customer->group->discount_percentage > 0 && $billDiscountRate === (float) $customer->group->discount_percentage);

        if (($billDiscountRate > 0 || $billDiscountAmountInput > 0) && !$hasDiscountPermission && !$isCustomerGroupDiscount) {
            throw ValidationException::withMessages([
                'discount' => ['You do not have permission to apply discounts (pos.discount required).']
            ]);
        }

        $isGstBill = array_key_exists('is_gst_bill', $data) ? (bool) $data['is_gst_bill'] : true;

        // Pre-validate stock availability using centralized stock service contract
        $this->stockService->validateStockAvailability($branchId, $itemsData);

        // Fetch active cash register shift for cashier/user if any
        $activeShift = $this->cashRegisterService->getCurrentShift($branchId, $user->id);

        return DB::transaction(function () use (
            $data,
            $itemsData,
            $user,
            $branch,
            $branchId,
            $customerId,
            $customer,
            $hasDiscountPermission,
            $billDiscountType,
            $billDiscountRate,
            $billDiscountAmountInput,
            $isGstBill,
            $activeShift,
            $idempotencyKey
        ) {
            $orderDate = !empty($data['order_date']) ? Carbon::parse($data['order_date']) : now();
            $invoiceNumber = $this->generateInvoiceNumber($branch, $orderDate);

            $processedItems = [];
            $subtotalSum = 0.00;
            $taxAmountSum = 0.00;
            $cgstAmountSum = 0.00;
            $sgstAmountSum = 0.00;
            $igstAmountSum = 0.00;
            $itemsNetTotal = 0.00;

            foreach ($itemsData as $index => $itemInput) {
                $productId = (int) $itemInput['product_id'];
                $product = Product::with(['unit', 'taxSlab', 'variants'])->find($productId);

                if (!$product || !$product->is_active) {
                    throw ValidationException::withMessages([
                        "items.{$index}.product_id" => ["Product #{$productId} is not available or inactive."]
                    ]);
                }

                $variantId = !empty($itemInput['product_variant_id'])
                    ? (int) $itemInput['product_variant_id']
                    : (!empty($itemInput['variant_id']) ? (int) $itemInput['variant_id'] : null);
                $variant = null;
                if ($variantId) {
                    $variant = $product->variants->firstWhere('id', $variantId);
                    if (!$variant || !$variant->is_active) {
                        throw ValidationException::withMessages([
                            "items.{$index}.product_variant_id" => ["Selected variant is not available."]
                        ]);
                    }
                }

                $quantity = (float) $itemInput['quantity'];
                if ($quantity <= 0) {
                    throw ValidationException::withMessages([
                        "items.{$index}.quantity" => ['Quantity must be greater than zero.']
                    ]);
                }

                // Check unit decimal constraints
                if ($product->unit && !$product->unit->allow_decimals) {
                    if (floor($quantity) != $quantity) {
                        throw ValidationException::withMessages([
                            "items.{$index}.quantity" => ["Unit [{$product->unit->name}] does not allow decimal quantities."]
                        ]);
                    }
                }

                // Determine effective unit price (respects promotional/special branch price if active)
                $priceInfo = $product->getEffectivePrice($branchId, $variantId);
                $unitPrice = (!empty($priceInfo['special_price']) && (float) $priceInfo['special_price'] > 0)
                    ? (float) $priceInfo['special_price']
                    : (float) $priceInfo['selling_price'];

                // Calculate item-level discount
                $itemDiscountType = $itemInput['discount_type'] ?? null;
                $itemDiscountRate = isset($itemInput['discount_rate']) ? (float) $itemInput['discount_rate'] : 0.0;
                $itemDiscountInput = isset($itemInput['discount_amount']) ? (float) $itemInput['discount_amount'] : 0.0;

                if (($itemDiscountRate > 0 || $itemDiscountInput > 0) && !$hasDiscountPermission) {
                    throw ValidationException::withMessages([
                        "items.{$index}.discount" => ['Permission pos.discount is required to apply item discounts.']
                    ]);
                }

                $grossLine = round($unitPrice * $quantity, 2);
                $itemDiscountAmount = 0.00;
                if ($itemDiscountType === 'percentage' && $itemDiscountRate > 0) {
                    $itemDiscountAmount = round($grossLine * ($itemDiscountRate / 100), 2);
                } elseif ($itemDiscountType === 'fixed' && $itemDiscountInput > 0) {
                    $itemDiscountAmount = round(min($itemDiscountInput, $grossLine), 2);
                }

                $lineAfterDiscount = round($grossLine - $itemDiscountAmount, 2);

                // Tax calculations
                $taxRate = $isGstBill ? (float) ($product->tax_rate ?? 0.0) : 0.0;
                $isTaxInclusive = (bool) $product->is_tax_inclusive;
                $itemTaxAmount = 0.00;
                $itemCgst = 0.00;
                $itemSgst = 0.00;
                $itemSubtotal = 0.00;
                $itemTotal = 0.00;

                if ($isGstBill && $taxRate > 0) {
                    if ($isTaxInclusive) {
                        // Tax is included inside unit price
                        $taxableBase = round($lineAfterDiscount / (1 + ($taxRate / 100)), 2);
                        $itemTaxAmount = round($lineAfterDiscount - $taxableBase, 2);
                        $itemSubtotal = $taxableBase;
                        $itemTotal = $lineAfterDiscount;
                    } else {
                        // Tax is added on top of selling price
                        $itemSubtotal = $lineAfterDiscount;
                        $itemTaxAmount = round($itemSubtotal * ($taxRate / 100), 2);
                        $itemTotal = round($itemSubtotal + $itemTaxAmount, 2);
                    }
                    $itemCgst = round($itemTaxAmount / 2, 2);
                    $itemSgst = round($itemTaxAmount - $itemCgst, 2);
                } else {
                    $itemSubtotal = $lineAfterDiscount;
                    $itemTaxAmount = 0.00;
                    $itemCgst = 0.00;
                    $itemSgst = 0.00;
                    $itemTotal = $lineAfterDiscount;
                }

                $subtotalSum += $itemSubtotal;
                $taxAmountSum += $itemTaxAmount;
                $cgstAmountSum += $itemCgst;
                $sgstAmountSum += $itemSgst;
                $itemsNetTotal += $itemTotal;

                $variantName = null;
                if ($variant && is_array($variant->attributes_json)) {
                    $variantName = implode(', ', array_map(
                        fn($k, $v) => "{$k}: {$v}",
                        array_keys($variant->attributes_json),
                        $variant->attributes_json
                    ));
                }

                $processedItems[] = [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant?->id,
                    'product_name' => $product->name,
                    'variant_name' => $variantName,
                    'sku' => $variant?->variant_sku ?? $product->sku,
                    'barcode' => $variant?->variant_barcode ?? $product->barcode,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'discount_type' => $itemDiscountType,
                    'discount_rate' => $itemDiscountRate,
                    'discount_amount' => $itemDiscountAmount,
                    'tax_slab_id' => $product->tax_slab_id,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTaxAmount,
                    'cgst_amount' => $itemCgst,
                    'sgst_amount' => $itemSgst,
                    'igst_amount' => 0.00,
                    'is_tax_inclusive' => $isTaxInclusive,
                    'subtotal' => $itemSubtotal,
                    'total' => $itemTotal,
                ];
            }

            // Calculate bill-level discount
            $finalBillDiscount = 0.00;
            if ($billDiscountType === 'percentage' && $billDiscountRate > 0) {
                $finalBillDiscount = round($itemsNetTotal * ($billDiscountRate / 100), 2);
            } elseif ($billDiscountType === 'fixed' && $billDiscountAmountInput > 0) {
                $finalBillDiscount = round(min($billDiscountAmountInput, $itemsNetTotal), 2);
            }

            $preRoundTotal = round($itemsNetTotal - $finalBillDiscount, 2);

            // Grand total & Rounding
            $enableRounding = $data['enable_rounding'] ?? true;
            if ($enableRounding) {
                $grandTotal = round($preRoundTotal, 0);
                $roundOff = round($grandTotal - $preRoundTotal, 2);
            } else {
                $grandTotal = $preRoundTotal;
                $roundOff = 0.00;
            }

            // Customer verification if provided
            $customerId = !empty($data['customer_id']) ? (int) $data['customer_id'] : null;
            $customer = null;
            if ($customerId) {
                $customer = Customer::lockForUpdate()->find($customerId);
                if (!$customer || !$customer->is_active) {
                    throw ValidationException::withMessages([
                        'customer_id' => ['Selected customer is invalid or inactive.']
                    ]);
                }
            }

            // Process payments
            $paymentsInput = $data['payments'] ?? [];
            if (empty($paymentsInput)) {
                // If single paymentMethod provided at root (POS quick pay convenience)
                if (!empty($data['payment_method'])) {
                    $paymentsInput = [[
                        'payment_method' => strtolower($data['payment_method']),
                        'amount' => (float) ($data['paid_amount'] ?? $grandTotal),
                        'payment_reference' => $data['payment_reference'] ?? null,
                    ]];
                } else {
                    throw ValidationException::withMessages([
                        'payments' => ['At least one payment record is required.']
                    ]);
                }
            }

            $totalPaid = 0.00;
            $cashPaid = 0.00;
            $processedPayments = [];

            foreach ($paymentsInput as $pIdx => $paymentItem) {
                $pMethod = strtolower(trim($paymentItem['payment_method'] ?? 'cash'));
                if (!in_array($pMethod, ['cash', 'card', 'upi', 'other'])) {
                    throw ValidationException::withMessages([
                        "payments.{$pIdx}.payment_method" => ["Invalid payment method: {$pMethod}."]
                    ]);
                }

                $pAmount = (float) ($paymentItem['amount'] ?? 0.0);
                if ($pAmount <= 0) {
                    throw ValidationException::withMessages([
                        "payments.{$pIdx}.amount" => ['Payment amount must be greater than zero.']
                    ]);
                }

                $totalPaid += $pAmount;
                if ($pMethod === 'cash') {
                    $cashPaid += $pAmount;
                }

                $processedPayments[] = [
                    'branch_id' => $branchId,
                    'user_id' => $user->id,
                    'cash_register_shift_id' => $activeShift?->id,
                    'payment_method' => $pMethod,
                    'amount' => $pAmount,
                    'payment_reference' => $paymentItem['payment_reference'] ?? null,
                    'status' => 'successful',
                    'payment_date' => now(),
                    'notes' => $paymentItem['notes'] ?? null,
                ];
            }

            $totalPaid = round($totalPaid, 2);
            $changeAmount = 0.00;
            $paymentStatus = 'paid';

            if ($totalPaid >= $grandTotal) {
                $changeAmount = round($totalPaid - $grandTotal, 2);
                $paymentStatus = 'paid';
            } else {
                $paymentStatus = 'partial';
            }

            // Customer Credit Limit Validation
            $unpaidAmount = max(0, round($grandTotal - $totalPaid, 2));
            if ($customer && $unpaidAmount > 0) {
                if ((float) $customer->credit_limit > 0) {
                    $newBalance = round((float) $customer->current_balance + $unpaidAmount, 2);
                    if ($newBalance > (float) $customer->credit_limit) {
                        throw ValidationException::withMessages([
                            'customer_id' => [
                                "Customer credit limit exceeded. Current balance: {$customer->current_balance}, Credit Limit: {$customer->credit_limit}, New unpaid amount: {$unpaidAmount}."
                            ]
                        ]);
                    }
                }
            }

            // Create Sales Order
            $salesOrder = SalesOrder::create([
                'branch_id' => $branchId,
                'user_id' => $user->id,
                'customer_id' => $customerId,
                'cash_register_shift_id' => $activeShift?->id,
                'invoice_number' => $invoiceNumber,
                'order_date' => $orderDate,
                'status' => 'completed',
                'payment_status' => $paymentStatus,
                'is_gst_bill' => $isGstBill,
                'subtotal' => round($subtotalSum, 2),
                'discount_type' => $billDiscountType,
                'discount_rate' => $billDiscountRate,
                'discount_amount' => $finalBillDiscount,
                'tax_amount' => round($taxAmountSum, 2),
                'cgst_amount' => round($cgstAmountSum, 2),
                'sgst_amount' => round($sgstAmountSum, 2),
                'igst_amount' => round($igstAmountSum, 2),
                'round_off' => $roundOff,
                'grand_total' => $grandTotal,
                'paid_amount' => $totalPaid,
                'change_amount' => $changeAmount,
                'notes' => $data['notes'] ?? null,
                'metadata' => array_merge(
                    is_array($data['metadata'] ?? null) ? $data['metadata'] : [],
                    $idempotencyKey ? ['idempotency_key' => $idempotencyKey] : []
                ),
            ]);

            // Save items
            foreach ($processedItems as $item) {
                $item['sales_order_id'] = $salesOrder->id;
                SalesOrderItem::create($item);
            }

            // Save payments
            foreach ($processedPayments as $payment) {
                $payment['sales_order_id'] = $salesOrder->id;
                SalesPayment::create($payment);
            }

            // Record cash portion in shift
            if ($activeShift && $cashPaid > 0) {
                // Effective cash retained is cashPaid minus changeAmount
                $netCashReceived = max(0, round($cashPaid - $changeAmount, 2));
                $this->cashRegisterService->recordCashSale($activeShift->id, $netCashReceived);
            }

            // Deduct stock using centralized stock integration service
            $this->stockService->deductStockForSale($salesOrder);

            // Record customer credit balance & ledger entry if unpaid portion exists
            if ($customer && $unpaidAmount > 0) {
                $newBal = round((float) $customer->current_balance + $unpaidAmount, 2);
                $customer->current_balance = $newBal;
                $customer->save();

                CustomerLedger::create([
                    'customer_id' => $customer->id,
                    'branch_id' => $branchId,
                    'transaction_type' => 'sale',
                    'reference_type' => 'sales_order',
                    'reference_id' => $salesOrder->id,
                    'transaction_date' => $orderDate->toDateString(),
                    'debit' => $unpaidAmount,
                    'credit' => 0.00,
                    'running_balance' => $newBal,
                    'notes' => "Sale invoice #{$salesOrder->invoice_number} (Credit amount: {$unpaidAmount})",
                ]);
            }

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'branch_id' => $branchId,
                'action' => 'SALE_CREATED',
                'auditable_type' => SalesOrder::class,
                'auditable_id' => $salesOrder->id,
                'new_values' => [
                    'invoice_number' => $salesOrder->invoice_number,
                    'grand_total' => $salesOrder->grand_total,
                    'payment_status' => $salesOrder->payment_status,
                    'items_count' => count($processedItems),
                ],
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'created_at' => now(),
            ]);

            return $salesOrder->load(['customer', 'items.product', 'items.variant', 'payments', 'user', 'branch']);
        });
    }

    /**
     * List sales with search, date filters, customer filters, and payment status filters.
     */
    public function getSales(int $branchId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = SalesOrder::with(['customer', 'user', 'payments', 'items'])
            ->where('branch_id', $branchId)
            ->latest('order_date');

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('phone', 'LIKE', "%{$search}%")
                            ->orWhere('customer_code', 'LIKE', "%{$search}%");
                    });
            });
        }

        if (!empty($filters['customer_id'])) {
            $query->where('customer_id', (int) $filters['customer_id']);
        }

        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('order_date', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('order_date', '<=', $filters['to_date']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get sale details by ID for branch.
     */
    public function getSaleById(int $id, int $branchId): SalesOrder
    {
        $sale = SalesOrder::with(['customer', 'user', 'branch', 'items.product.unit', 'items.variant', 'payments'])
            ->where('branch_id', $branchId)
            ->find($id);

        if (!$sale) {
            throw ValidationException::withMessages([
                'sale' => ['Sales order not found for this branch.']
            ]);
        }

        return $sale;
    }

    /**
     * Get aggregate sales summary metrics for dashboard or POS overview.
     */
    public function getSalesSummary(int $branchId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $query = SalesOrder::where('branch_id', $branchId)->where('status', 'completed');

        if ($fromDate) {
            $query->whereDate('order_date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->whereDate('order_date', '<=', $toDate);
        }

        $orders = $query->get();
        $totalSales = $orders->count();
        $totalRevenue = (float) $orders->sum('grand_total');
        $totalTax = (float) $orders->sum('tax_amount');
        $totalDiscount = (float) $orders->sum('discount_amount');

        $paymentsQuery = SalesPayment::where('branch_id', $branchId)->where('status', 'successful');
        if ($fromDate) {
            $paymentsQuery->whereDate('payment_date', '>=', $fromDate);
        }
        if ($toDate) {
            $paymentsQuery->whereDate('payment_date', '<=', $toDate);
        }

        $payments = $paymentsQuery->get();
        $cashTotal = (float) $payments->where('payment_method', 'cash')->sum('amount');
        $upiTotal = (float) $payments->where('payment_method', 'upi')->sum('amount');
        $cardTotal = (float) $payments->where('payment_method', 'card')->sum('amount');
        $otherTotal = (float) $payments->whereNotIn('payment_method', ['cash', 'upi', 'card'])->sum('amount');

        return [
            'total_sales_count' => $totalSales,
            'total_revenue' => round($totalRevenue, 2),
            'total_tax' => round($totalTax, 2),
            'total_discount' => round($totalDiscount, 2),
            'payment_breakdown' => [
                'cash' => round($cashTotal, 2),
                'upi' => round($upiTotal, 2),
                'card' => round($cardTotal, 2),
                'other' => round($otherTotal, 2),
            ],
        ];
    }

    /**
     * Cancel an existing completed sales order and reverse stock & payments.
     */
    public function cancelSale(int $id, int $branchId, User $user, ?string $reason = null): SalesOrder
    {
        return DB::transaction(function () use ($id, $branchId, $user, $reason) {
            $sale = SalesOrder::with(['items', 'payments', 'customer'])
                ->where('id', $id)
                ->where('branch_id', $branchId)
                ->lockForUpdate()
                ->first();

            if (!$sale) {
                throw ValidationException::withMessages([
                    'sale' => ['Sales order not found for this branch.']
                ]);
            }

            if ($sale->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'sale' => ['This sales order has already been cancelled.']
                ]);
            }

            if ($sale->status !== 'completed') {
                throw ValidationException::withMessages([
                    'sale' => ["Only completed sales can be cancelled (current status: {$sale->status})."]
                ]);
            }

            // 1. Reverse stock deductions atomically using lockForUpdate
            $this->stockService->reverseStockForSale($sale, $reason);

            // 2. Reverse cash portion in register shift if shift is open
            $cashPaid = (float) $sale->payments
                ->where('payment_method', 'cash')
                ->where('status', 'successful')
                ->sum('amount');

            $changeAmount = (float) $sale->change_amount;
            $netCashReceived = max(0, round($cashPaid - $changeAmount, 2));

            if ($sale->cash_register_shift_id && $netCashReceived > 0) {
                $this->cashRegisterService->reverseCashSale($sale->cash_register_shift_id, $netCashReceived);
            }

            // 3. Mark all payments as refunded
            SalesPayment::where('sales_order_id', $sale->id)->update([
                'status' => 'refunded',
                'updated_at' => now(),
            ]);

            // 4. Update sales order status and append cancellation note
            $sale->status = 'cancelled';
            $cancellationNote = " [CANCELLED: " . ($reason ?: 'No reason provided') . " by {$user->name}]";
            $sale->notes = trim(($sale->notes ?? '') . $cancellationNote);
            $sale->save();

            // 5. Reverse customer credit balance & ledger if sale had unpaid credit amount
            if ($sale->customer_id) {
                $unpaid = max(0, round((float) $sale->grand_total - (float) $sale->paid_amount, 2));
                if ($unpaid > 0) {
                    $customer = Customer::lockForUpdate()->find($sale->customer_id);
                    if ($customer) {
                        $newBal = round((float) $customer->current_balance - $unpaid, 2);
                        $customer->current_balance = $newBal;
                        $customer->save();

                        CustomerLedger::create([
                            'customer_id' => $customer->id,
                            'branch_id' => $branchId,
                            'transaction_type' => 'credit_adjustment',
                            'reference_type' => 'sales_order',
                            'reference_id' => $sale->id,
                            'transaction_date' => now()->toDateString(),
                            'debit' => 0.00,
                            'credit' => $unpaid,
                            'running_balance' => $newBal,
                            'notes' => "Reversal of credit charge for cancelled sale #{$sale->invoice_number}",
                        ]);
                    }
                }
            }

            // 5. Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'branch_id' => $branchId,
                'action' => 'SALE_CANCELLED',
                'auditable_type' => SalesOrder::class,
                'auditable_id' => $sale->id,
                'new_values' => [
                    'invoice_number' => $sale->invoice_number,
                    'grand_total' => $sale->grand_total,
                    'status' => 'cancelled',
                    'reason' => $reason,
                ],
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'created_at' => now(),
            ]);

            return $sale->fresh(['customer', 'items.product', 'items.variant', 'payments', 'user', 'branch']);
        });
    }
}
