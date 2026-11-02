<?php

namespace App\Services\Sales;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SalesReturnService
{
    public function __construct(
        protected CashRegisterService $cashRegisterService
    ) {}

    /**
     * Generate unique sequential return number
     */
    public function generateReturnNumber(Branch $branch, ?Carbon $date = null): string
    {
        $date = $date ?? now();
        $dateStr = $date->format('Ymd');
        $prefix = "SRTN-{$branch->branch_code}-{$dateStr}-";

        $latest = SalesReturn::withTrashed()
            ->where('branch_id', $branch->id)
            ->where('return_number', 'LIKE', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->value('return_number');

        if ($latest) {
            $lastSeq = (int) substr($latest, strrpos($latest, '-') + 1);
            $seq = $lastSeq + 1;
        } else {
            $seq = 1;
        }

        return $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Process and record a sales return (partial or full)
     */
    public function createReturn(array $data, User $user, Branch $branch): SalesReturn
    {
        return DB::transaction(function () use ($data, $user, $branch) {
            $branchId = $branch->id;
            $orderId = !empty($data['sales_order_id']) ? (int) $data['sales_order_id'] : null;
            $salesOrder = null;

            if ($orderId) {
                $salesOrder = SalesOrder::with(['items', 'customer'])
                    ->where('id', $orderId)
                    ->where('branch_id', $branchId)
                    ->lockForUpdate()
                    ->first();

                if (!$salesOrder) {
                    throw ValidationException::withMessages([
                        'sales_order_id' => ['Original sales order not found for this branch.']
                    ]);
                }

                if ($salesOrder->status === 'cancelled') {
                    throw ValidationException::withMessages([
                        'sales_order_id' => ['Cannot return items from a cancelled sales order.']
                    ]);
                }
            }

            $customerId = !empty($data['customer_id']) ? (int) $data['customer_id'] : ($salesOrder?->customer_id);
            $customer = null;
            if ($customerId) {
                $customer = Customer::lockForUpdate()->find($customerId);
            }

            $refundMethod = strtolower($data['refund_method'] ?? 'cash');
            if (!in_array($refundMethod, ['cash', 'card', 'upi', 'credit_note', 'customer_balance'])) {
                throw ValidationException::withMessages([
                    'refund_method' => ["Invalid refund method: {$refundMethod}."]
                ]);
            }

            if ($refundMethod === 'customer_balance' && !$customer) {
                throw ValidationException::withMessages([
                    'refund_method' => ['A valid customer profile is required to refund to customer balance.']
                ]);
            }

            $itemsInput = $data['items'] ?? [];
            if (empty($itemsInput)) {
                throw ValidationException::withMessages([
                    'items' => ['At least one return line item is required.']
                ]);
            }

            // Get active shift for cashier
            $activeShift = $this->cashRegisterService->getCurrentShift($branchId, $user->id);

            $returnDate = !empty($data['return_date']) ? Carbon::parse($data['return_date']) : now();
            $returnNumber = $this->generateReturnNumber($branch, $returnDate);

            $processedItems = [];
            $subtotalSum = 0.00;
            $taxAmountSum = 0.00;
            $totalAmountSum = 0.00;

            foreach ($itemsInput as $idx => $itemInput) {
                $productId = (int) $itemInput['product_id'];
                $variantId = !empty($itemInput['variant_id']) ? (int) $itemInput['variant_id'] : null;
                $quantity = (float) $itemInput['quantity'];

                if ($quantity <= 0) {
                    throw ValidationException::withMessages([
                        "items.{$idx}.quantity" => ['Return quantity must be greater than zero.']
                    ]);
                }

                $orderItemId = !empty($itemInput['sales_order_item_id']) ? (int) $itemInput['sales_order_item_id'] : null;
                $unitPrice = isset($itemInput['unit_price']) ? (float) $itemInput['unit_price'] : 0.00;
                $taxRate = isset($itemInput['tax_rate']) ? (float) $itemInput['tax_rate'] : 0.00;

                if ($salesOrder) {
                    $orderItem = $salesOrder->items->firstWhere('id', $orderItemId);
                    if (!$orderItem) {
                        // Try matching by product and variant
                        $orderItem = $salesOrder->items->first(function ($it) use ($productId, $variantId) {
                            return $it->product_id === $productId && $it->product_variant_id === $variantId;
                        });
                    }

                    if (!$orderItem) {
                        throw ValidationException::withMessages([
                            "items.{$idx}" => ["Item does not belong to the selected sales order."]
                        ]);
                    }

                    // Check already returned quantities across existing completed returns
                    $alreadyReturned = (float) SalesReturnItem::where('sales_order_item_id', $orderItem->id)
                        ->whereHas('salesReturn', function ($rq) {
                            $rq->where('status', 'completed');
                        })
                        ->sum('quantity');

                    $maxReturnable = round((float) $orderItem->quantity - $alreadyReturned, 3);
                    if ($quantity > $maxReturnable) {
                        throw ValidationException::withMessages([
                            "items.{$idx}.quantity" => [
                                "Return quantity ({$quantity}) exceeds max returnable quantity ({$maxReturnable}) for [{$orderItem->product_name}]."
                            ]
                        ]);
                    }

                    $orderItemId = $orderItem->id;
                    $unitPrice = (float) $orderItem->unit_price;
                    $taxRate = (float) $orderItem->tax_rate;
                }

                $lineSubtotal = round($unitPrice * $quantity, 2);
                $lineTax = round(($lineSubtotal * $taxRate) / 100, 2);
                $lineTotal = round($lineSubtotal + $lineTax, 2);

                $subtotalSum += $lineSubtotal;
                $taxAmountSum += $lineTax;
                $totalAmountSum += $lineTotal;

                $restock = isset($itemInput['restock']) ? (bool) $itemInput['restock'] : true;
                $condition = strtolower($itemInput['condition'] ?? 'good');

                $processedItems[] = [
                    'sales_order_item_id' => $orderItemId,
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $lineTax,
                    'total_amount' => $lineTotal,
                    'restock' => $restock,
                    'condition' => $condition,
                ];
            }

            // Create Return Header
            $salesReturn = SalesReturn::create([
                'return_number' => $returnNumber,
                'sales_order_id' => $orderId,
                'branch_id' => $branchId,
                'customer_id' => $customerId,
                'user_id' => $user->id,
                'cash_register_shift_id' => $activeShift?->id,
                'return_date' => $returnDate->toDateString(),
                'subtotal' => round($subtotalSum, 2),
                'tax_amount' => round($taxAmountSum, 2),
                'total_amount' => round($totalAmountSum, 2),
                'refund_method' => $refundMethod,
                'status' => 'completed',
                'reason' => $data['reason'] ?? 'Customer Return',
                'notes' => $data['notes'] ?? null,
            ]);

            // Save Return Items and execute Stock Reversal
            foreach ($processedItems as $item) {
                $item['sales_return_id'] = $salesReturn->id;
                SalesReturnItem::create($item);

                if ($item['restock']) {
                    $stock = BranchStock::firstOrCreate(
                        ['branch_id' => $branchId, 'product_id' => $item['product_id'], 'variant_id' => $item['variant_id']],
                        ['quantity' => 0.000, 'damaged_quantity' => 0.000]
                    );

                    $prevQty = (float) $stock->quantity;

                    if ($item['condition'] === 'damaged' || $item['condition'] === 'defective') {
                        $prevDamaged = (float) $stock->damaged_quantity;
                        $stock->damaged_quantity = $prevDamaged + $item['quantity'];
                        $stock->save();

                        StockMovement::create([
                            'branch_id' => $branchId,
                            'product_id' => $item['product_id'],
                            'product_variant_id' => $item['variant_id'],
                            'movement_type' => 'damage',
                            'quantity' => $item['quantity'],
                            'previous_quantity' => $prevDamaged,
                            'new_quantity' => $stock->damaged_quantity,
                            'unit_cost' => $item['unit_price'],
                            'reference_type' => 'sales_return',
                            'reference_id' => $salesReturn->id,
                            'reason' => "Sales Return Damaged: {$returnNumber}",
                            'remarks' => "Condition: {$item['condition']}",
                            'user_id' => $user->id,
                        ]);
                    } else {
                        // Salable stock restored
                        $newQty = $prevQty + $item['quantity'];
                        $stock->quantity = $newQty;
                        $stock->save();

                        StockMovement::create([
                            'branch_id' => $branchId,
                            'product_id' => $item['product_id'],
                            'product_variant_id' => $item['variant_id'],
                            'movement_type' => 'return',
                            'quantity' => $item['quantity'],
                            'previous_quantity' => $prevQty,
                            'new_quantity' => $newQty,
                            'unit_cost' => $item['unit_price'],
                            'reference_type' => 'sales_return',
                            'reference_id' => $salesReturn->id,
                            'reason' => "Sales Return: {$returnNumber}",
                            'remarks' => "Restocked into inventory",
                            'user_id' => $user->id,
                        ]);
                    }
                }
            }

            // Financial & Register Handling
            if ($refundMethod === 'cash') {
                if ($activeShift) {
                    $this->cashRegisterService->recordCashMovement(
                        $activeShift->id,
                        $user->id,
                        'cash_out',
                        $salesReturn->total_amount,
                        "Sales Return Refund #{$returnNumber}"
                    );
                }
            } elseif ($refundMethod === 'credit_note') {
                if (!$customer) {
                    throw ValidationException::withMessages([
                        'refund_method' => ['A customer must be selected to issue a credit note.']
                    ]);
                }

                $cnPrefix = "CN-{$branch->branch_code}-" . date('Ymd') . "-";
                $lastCn = CreditNote::where('credit_note_number', 'LIKE', "{$cnPrefix}%")->latest('id')->value('credit_note_number');
                $cnSeq = $lastCn ? ((int) substr($lastCn, strrpos($lastCn, '-') + 1) + 1) : 1;
                $cnNumber = $cnPrefix . str_pad((string) $cnSeq, 4, '0', STR_PAD_LEFT);

                CreditNote::create([
                    'credit_note_number' => $cnNumber,
                    'branch_id' => $branchId,
                    'customer_id' => $customer->id,
                    'sales_return_id' => $salesReturn->id,
                    'sales_order_id' => $orderId,
                    'user_id' => $user->id,
                    'issue_date' => $returnDate->toDateString(),
                    'amount' => $salesReturn->total_amount,
                    'used_amount' => 0.00,
                    'balance_amount' => $salesReturn->total_amount,
                    'status' => 'active',
                    'expiry_date' => $returnDate->copy()->addMonths(6)->toDateString(),
                    'notes' => "Issued for Sales Return #{$returnNumber}",
                ]);
            } elseif ($refundMethod === 'customer_balance') {
                $prevBalance = (float) $customer->current_balance;
                $newBalance = round($prevBalance - $salesReturn->total_amount, 2);
                $customer->current_balance = $newBalance;
                $customer->save();

                CustomerLedger::create([
                    'customer_id' => $customer->id,
                    'branch_id' => $branchId,
                    'transaction_type' => 'return',
                    'reference_type' => 'sales_return',
                    'reference_id' => $salesReturn->id,
                    'transaction_date' => $returnDate->toDateString(),
                    'debit' => 0.00,
                    'credit' => $salesReturn->total_amount,
                    'running_balance' => $newBalance,
                    'notes' => "Refund credit for Sales Return #{$returnNumber}",
                ]);
            }

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'branch_id' => $branchId,
                'action' => 'SALES_RETURN_CREATED',
                'auditable_type' => SalesReturn::class,
                'auditable_id' => $salesReturn->id,
                'new_values' => [
                    'return_number' => $salesReturn->return_number,
                    'sales_order_id' => $salesReturn->sales_order_id,
                    'total_amount' => $salesReturn->total_amount,
                    'refund_method' => $salesReturn->refund_method,
                    'items_count' => count($processedItems),
                ],
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'created_at' => now(),
            ]);

            return $salesReturn->load(['customer', 'salesOrder', 'items.product', 'items.variant', 'user', 'branch']);
        });
    }

    /**
     * List sales returns with filtering
     */
    public function getReturns(int $branchId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = SalesReturn::with(['customer', 'salesOrder', 'items.product', 'user'])
            ->where('branch_id', $branchId)
            ->latest('return_date');

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('return_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('salesOrder', fn ($sq) => $sq->where('invoice_number', 'LIKE', "%{$search}%"))
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'LIKE', "%{$search}%"));
            });
        }

        if (!empty($filters['customer_id'])) {
            $query->where('customer_id', (int) $filters['customer_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('return_date', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('return_date', '<=', $filters['to_date']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get single return details
     */
    public function getReturnById(int $id, int $branchId): SalesReturn
    {
        $return = SalesReturn::with(['customer', 'salesOrder.items', 'items.product', 'items.variant', 'user', 'branch'])
            ->where('branch_id', $branchId)
            ->find($id);

        if (!$return) {
            throw ValidationException::withMessages([
                'sales_return' => ['Sales return not found for this branch.']
            ]);
        }

        return $return;
    }

    /**
     * List Credit Notes with filtering
     */
    public function getCreditNotes(int $branchId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = CreditNote::with(['customer', 'salesReturn', 'salesOrder'])
            ->where('branch_id', $branchId)
            ->latest('issue_date');

        if (!empty($filters['customer_id'])) {
            $query->where('customer_id', (int) $filters['customer_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('credit_note_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'LIKE', "%{$search}%"));
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Redeem credit note against a sale
     */
    public function redeemCreditNote(CreditNote $creditNote, float $amount, ?int $salesOrderId = null, ?User $user = null): CreditNote
    {
        return DB::transaction(function () use ($creditNote, $amount, $salesOrderId, $user) {
            $cn = CreditNote::lockForUpdate()->find($creditNote->id);

            if ($cn->status !== 'active' && $cn->status !== 'partially_used') {
                throw ValidationException::withMessages([
                    'credit_note' => ["Credit note is already {$cn->status}."]
                ]);
            }

            if ($cn->expiry_date && Carbon::parse($cn->expiry_date)->isPast()) {
                $cn->status = 'expired';
                $cn->save();
                throw ValidationException::withMessages([
                    'credit_note' => ['Credit note has expired.']
                ]);
            }

            $currentBalance = (float) $cn->balance_amount;
            if ($amount <= 0 || $amount > $currentBalance) {
                throw ValidationException::withMessages([
                    'amount' => ["Redeem amount ({$amount}) exceeds available credit balance ({$currentBalance})."]
                ]);
            }

            $newUsed = (float) $cn->used_amount + $amount;
            $newBalance = $currentBalance - $amount;

            $cn->used_amount = $newUsed;
            $cn->balance_amount = $newBalance;
            $cn->status = ($newBalance <= 0) ? 'redeemed' : 'partially_used';
            $cn->save();

            AuditLog::create([
                'user_id' => $user?->id,
                'branch_id' => $cn->branch_id,
                'action' => 'CREDIT_NOTE_REDEEMED',
                'auditable_type' => CreditNote::class,
                'auditable_id' => $cn->id,
                'new_values' => [
                    'credit_note_number' => $cn->credit_note_number,
                    'redeemed_amount' => $amount,
                    'remaining_balance' => $newBalance,
                    'sales_order_id' => $salesOrderId,
                ],
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'created_at' => now(),
            ]);

            return $cn->fresh();
        });
    }
}
