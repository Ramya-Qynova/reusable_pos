<?php

namespace App\Services\Purchases;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\GoodsReceiptItem;
use App\Models\GoodsReceiptNote;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchasePayment;
use App\Models\PurchaseReturn;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PurchaseService
{
    /**
     * Dashboard statistics for Purchases
     */
    public function getDashboardStats(?int $branchId = null): array
    {
        $poQuery = PurchaseOrder::query();
        $invQuery = PurchaseInvoice::query();
        if ($branchId) {
            $poQuery->where('branch_id', $branchId);
            $invQuery->where('branch_id', $branchId);
        }

        $totalPurchases = (float) $invQuery->sum('total_amount');
        $totalPaid = (float) $invQuery->sum('paid_amount');
        $totalOutstanding = $totalPurchases - $totalPaid;
        $openOrders = (clone $poQuery)->whereIn('status', ['pending', 'partially_received'])->count();
        $pendingGrns = (clone $poQuery)->where('status', 'partially_received')->count();

        return [
            'total_purchases_amount' => round($totalPurchases, 2),
            'total_paid_amount' => round($totalPaid, 2),
            'total_outstanding_payable' => round($totalOutstanding, 2),
            'total_orders_count' => $poQuery->count(),
            'open_orders_count' => $openOrders,
            'pending_grns_count' => $pendingGrns,
            'suppliers_count' => Supplier::where('is_active', true)->count(),
        ];
    }

    /**
     * Paginated list of purchase orders
     */
    public function getPaginatedOrders(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = PurchaseOrder::query()
            ->with(['supplier:id,name,supplier_code,phone', 'branch:id,name,branch_code', 'user:id,name', 'items.product:id,name,sku']);

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
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

        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('po_number', 'LIKE', "%{$term}%")
                    ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'LIKE', "%{$term}%"));
            });
        }

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    /**
     * Create a Purchase Order
     */
    public function createPurchaseOrder(array $data, User $user): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = (int) $data['branch_id'];
            $supplierId = (int) $data['supplier_id'];
            $poNumber = 'PO-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $subtotal = 0.0;
            $taxTotal = 0.0;
            $discountTotal = 0.0;
            $grandTotal = 0.0;

            $itemsToCreate = [];
            foreach ($data['items'] as $item) {
                $qty = (float) $item['ordered_quantity'];
                $cost = (float) $item['unit_cost'];
                $lineSub = $qty * $cost;

                $discRate = isset($item['discount_rate']) ? (float) $item['discount_rate'] : 0.0;
                $discAmt = ($lineSub * $discRate) / 100;
                $taxable = $lineSub - $discAmt;

                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;
                $taxAmt = ($taxable * $taxRate) / 100;
                $lineTotal = $taxable + $taxAmt;

                $subtotal += $lineSub;
                $discountTotal += $discAmt;
                $taxTotal += $taxAmt;
                $grandTotal += $lineTotal;

                $itemsToCreate[] = [
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => !empty($item['variant_id']) ? (int) $item['variant_id'] : null,
                    'ordered_quantity' => $qty,
                    'received_quantity' => 0.000,
                    'unit_cost' => $cost,
                    'discount_rate' => $discRate,
                    'discount_amount' => $discAmt,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmt,
                    'total_amount' => $lineTotal,
                ];
            }

            $po = PurchaseOrder::create([
                'po_number' => $poNumber,
                'branch_id' => $branchId,
                'supplier_id' => $supplierId,
                'user_id' => $user->id,
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'discount_amount' => $discountTotal,
                'total_amount' => $grandTotal,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($itemsToCreate as $it) {
                $po->items()->create($it);
            }

            return $po->load(['items.product', 'supplier', 'branch', 'user']);
        });
    }

    /**
     * Record Goods Receipt (GRN)
     * Requirements: Update inventory ONLY for accepted quantities; record damaged/rejected separately.
     */
    public function recordGoodsReceipt(array $data, User $user): GoodsReceiptNote
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = (int) $data['branch_id'];
            $supplierId = (int) $data['supplier_id'];
            $poId = !empty($data['purchase_order_id']) ? (int) $data['purchase_order_id'] : null;
            $grnNumber = 'GRN-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $grn = GoodsReceiptNote::create([
                'grn_number' => $grnNumber,
                'purchase_order_id' => $poId,
                'branch_id' => $branchId,
                'supplier_id' => $supplierId,
                'received_by' => $user->id,
                'receipt_date' => $data['receipt_date'] ?? now(),
                'status' => 'completed',
                'supplier_invoice_number' => $data['supplier_invoice_number'] ?? null,
                'supplier_invoice_date' => $data['supplier_invoice_date'] ?? null,
                'remarks' => $data['remarks'] ?? null,
            ]);

            $totalAcceptedAmount = 0.0;

            foreach ($data['items'] as $item) {
                $productId = (int) $item['product_id'];
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $receivedQty = (float) $item['received_quantity'];
                $acceptedQty = (float) $item['accepted_quantity'];
                $damagedQty = isset($item['damaged_quantity']) ? (float) $item['damaged_quantity'] : 0.000;
                $rejectedQty = isset($item['rejected_quantity']) ? (float) $item['rejected_quantity'] : 0.000;
                $unitCost = (float) $item['unit_cost'];
                $batchNum = $item['batch_number'] ?? null;
                $expiryDate = $item['expiry_date'] ?? null;
                $poItemId = !empty($item['purchase_order_item_id']) ? (int) $item['purchase_order_item_id'] : null;

                $grn->items()->create([
                    'purchase_order_item_id' => $poItemId,
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'received_quantity' => $receivedQty,
                    'accepted_quantity' => $acceptedQty,
                    'damaged_quantity' => $damagedQty,
                    'rejected_quantity' => $rejectedQty,
                    'unit_cost' => $unitCost,
                    'batch_number' => $batchNum,
                    'expiry_date' => $expiryDate,
                ]);

                // Update Purchase Order Item received quantity if linked
                if ($poItemId) {
                    $poItem = PurchaseOrderItem::find($poItemId);
                    if ($poItem) {
                        $poItem->received_quantity = (float) $poItem->received_quantity + $acceptedQty;
                        $poItem->save();
                    }
                }

                // UPDATE INVENTORY ONLY FOR ACCEPTED RECEIVED QUANTITY
                if ($acceptedQty > 0) {
                    $stock = BranchStock::firstOrCreate(
                        ['branch_id' => $branchId, 'product_id' => $productId, 'variant_id' => $variantId],
                        ['quantity' => 0.000, 'damaged_quantity' => 0.000, 'reserved_quantity' => 0.000]
                    );

                    $prevQty = (float) $stock->quantity;
                    $newQty = $prevQty + $acceptedQty;
                    $stock->quantity = $newQty;

                    if ($damagedQty > 0) {
                        $stock->damaged_quantity = (float) $stock->damaged_quantity + $damagedQty;
                    }

                    $stock->save();

                    // Record in stock movements audit
                    StockMovement::create([
                        'branch_id' => $branchId,
                        'product_id' => $productId,
                        'product_variant_id' => $variantId,
                        'movement_type' => 'purchase_receipt',
                        'quantity' => $acceptedQty,
                        'previous_quantity' => $prevQty,
                        'new_quantity' => $newQty,
                        'unit_cost' => $unitCost,
                        'reference_type' => 'goods_receipt',
                        'reference_id' => $grn->id,
                        'reason' => "GRN receipt from {$grn->supplier?->name}",
                        'remarks' => "GRN #{$grnNumber}" . ($batchNum ? " Batch: {$batchNum}" : ""),
                        'user_id' => $user->id,
                    ]);

                    $totalAcceptedAmount += ($acceptedQty * $unitCost);
                }
            }

            // Update Purchase Order overall status if linked
            if ($poId) {
                $po = PurchaseOrder::with('items')->find($poId);
                if ($po) {
                    $allReceived = true;
                    $anyReceived = false;
                    foreach ($po->items as $it) {
                        if ($it->received_quantity < $it->ordered_quantity) {
                            $allReceived = false;
                        }
                        if ($it->received_quantity > 0) {
                            $anyReceived = true;
                        }
                    }

                    $po->status = $allReceived ? 'received' : ($anyReceived ? 'partially_received' : 'pending');
                    $po->save();
                }
            }

            // Automatically generate Purchase Invoice & Supplier Ledger entry
            $invNumber = 'PINV-' . date('Ymd') . '-' . strtoupper(Str::random(5));
            $taxAmount = round($totalAcceptedAmount * 0.05, 2); // Default estimate if not specified
            $invoiceTotal = $totalAcceptedAmount + $taxAmount;

            $invoice = PurchaseInvoice::create([
                'invoice_number' => $invNumber,
                'purchase_order_id' => $poId,
                'goods_receipt_note_id' => $grn->id,
                'branch_id' => $branchId,
                'supplier_id' => $supplierId,
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->addDays(30)->toDateString(),
                'subtotal' => $totalAcceptedAmount,
                'tax_amount' => $taxAmount,
                'discount_amount' => 0.00,
                'total_amount' => $invoiceTotal,
                'paid_amount' => 0.00,
                'payment_status' => 'unpaid',
                'notes' => "Auto-created from GRN #{$grnNumber}",
            ]);

            // Record in Supplier Ledger
            $lastBalance = (float) (SupplierLedger::where('supplier_id', $supplierId)->latest('id')->value('running_balance') ?? 0);
            $newBalance = $lastBalance + $invoiceTotal;

            SupplierLedger::create([
                'supplier_id' => $supplierId,
                'branch_id' => $branchId,
                'transaction_type' => 'purchase_invoice',
                'reference_type' => 'purchase_invoice',
                'reference_id' => $invoice->id,
                'transaction_date' => now()->toDateString(),
                'debit' => 0.00,
                'credit' => $invoiceTotal,
                'running_balance' => $newBalance,
                'description' => "Purchase Invoice #{$invNumber} for GRN #{$grnNumber}",
            ]);

            return $grn->load(['items.product', 'supplier', 'branch', 'purchaseOrder']);
        });
    }

    /**
     * Record Supplier Payment against a Purchase Invoice
     */
    public function recordPayment(array $data, User $user): PurchasePayment
    {
        return DB::transaction(function () use ($data, $user) {
            $invoice = PurchaseInvoice::findOrFail((int) $data['purchase_invoice_id']);
            $amount = (float) $data['amount'];
            $payNum = 'PAY-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $payment = PurchasePayment::create([
                'payment_number' => $payNum,
                'purchase_invoice_id' => $invoice->id,
                'supplier_id' => $invoice->supplier_id,
                'branch_id' => $invoice->branch_id,
                'user_id' => $user->id,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount' => $amount,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'transaction_reference' => $data['transaction_reference'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Update Invoice paid amount
            $newPaid = (float) $invoice->paid_amount + $amount;
            $invoice->paid_amount = $newPaid;
            if ($newPaid >= (float) $invoice->total_amount) {
                $invoice->payment_status = 'paid';
            } elseif ($newPaid > 0) {
                $invoice->payment_status = 'partially_paid';
            }
            $invoice->save();

            // Record in Supplier Ledger (debit reduces liability)
            $lastBalance = (float) (SupplierLedger::where('supplier_id', $invoice->supplier_id)->latest('id')->value('running_balance') ?? 0);
            $newBalance = $lastBalance - $amount;

            SupplierLedger::create([
                'supplier_id' => $invoice->supplier_id,
                'branch_id' => $invoice->branch_id,
                'transaction_type' => 'payment',
                'reference_type' => 'purchase_payment',
                'reference_id' => $payment->id,
                'transaction_date' => $payment->payment_date,
                'debit' => $amount,
                'credit' => 0.00,
                'running_balance' => $newBalance,
                'description' => "Payment #{$payNum} for Invoice #{$invoice->invoice_number}",
            ]);

            return $payment->load(['invoice', 'supplier']);
        });
    }

    /**
     * Record Purchase Return (reduces inventory and updates supplier ledger)
     */
    public function recordPurchaseReturn(array $data, User $user): PurchaseReturn
    {
        return DB::transaction(function () use ($data, $user) {
            $supplierId = (int) $data['supplier_id'];
            $branchId = (int) $data['branch_id'];
            $invoiceId = !empty($data['purchase_invoice_id']) ? (int) $data['purchase_invoice_id'] : null;
            $retNum = 'PRTN-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $subtotal = 0.0;
            $taxTotal = 0.0;
            $grandTotal = 0.0;

            $itemsData = [];
            foreach ($data['items'] as $item) {
                $qty = (float) $item['quantity'];
                $cost = (float) $item['unit_cost'];
                $lineSub = $qty * $cost;
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;
                $taxAmt = ($lineSub * $taxRate) / 100;
                $lineTotal = $lineSub + $taxAmt;

                $subtotal += $lineSub;
                $taxTotal += $taxAmt;
                $grandTotal += $lineTotal;

                $itemsData[] = [
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => !empty($item['variant_id']) ? (int) $item['variant_id'] : null,
                    'quantity' => $qty,
                    'unit_cost' => $cost,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmt,
                    'total_amount' => $lineTotal,
                ];
            }

            $return = PurchaseReturn::create([
                'return_number' => $retNum,
                'purchase_invoice_id' => $invoiceId,
                'supplier_id' => $supplierId,
                'branch_id' => $branchId,
                'user_id' => $user->id,
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'total_amount' => $grandTotal,
                'reason' => $data['reason'] ?? 'Defective / Excess Stock Return',
                'status' => 'completed',
            ]);

            foreach ($itemsData as $it) {
                $return->items()->create($it);

                // Deduct stock from inventory
                $stock = BranchStock::firstOrCreate(
                    ['branch_id' => $branchId, 'product_id' => $it['product_id'], 'variant_id' => $it['variant_id']],
                    ['quantity' => 0.000]
                );

                $prevQty = (float) $stock->quantity;
                $newQty = $prevQty - $it['quantity'];
                $stock->quantity = $newQty;
                $stock->save();

                // Record stock movement
                StockMovement::create([
                    'branch_id' => $branchId,
                    'product_id' => $it['product_id'],
                    'product_variant_id' => $it['variant_id'],
                    'movement_type' => 'return',
                    'quantity' => -$it['quantity'],
                    'previous_quantity' => $prevQty,
                    'new_quantity' => $newQty,
                    'unit_cost' => $it['unit_cost'],
                    'reference_type' => 'purchase_return',
                    'reference_id' => $return->id,
                    'reason' => "Purchase Return: {$retNum}",
                    'remarks' => $data['reason'] ?? null,
                    'user_id' => $user->id,
                ]);
            }

            // Record in Supplier Ledger (debit reduces supplier payable)
            $lastBalance = (float) (SupplierLedger::where('supplier_id', $supplierId)->latest('id')->value('running_balance') ?? 0);
            $newBalance = $lastBalance - $grandTotal;

            SupplierLedger::create([
                'supplier_id' => $supplierId,
                'branch_id' => $branchId,
                'transaction_type' => 'return',
                'reference_type' => 'purchase_return',
                'reference_id' => $return->id,
                'transaction_date' => $return->return_date,
                'debit' => $grandTotal,
                'credit' => 0.00,
                'running_balance' => $newBalance,
                'description' => "Purchase Return #{$retNum}",
            ]);

            return $return->load(['items.product', 'supplier']);
        });
    }

    /**
     * Get supplier ledger statement
     */
    public function getSupplierLedger(int $supplierId): array
    {
        $supplier = Supplier::findOrFail($supplierId);
        $entries = SupplierLedger::where('supplier_id', $supplierId)->orderBy('id', 'asc')->get();

        $totalCredit = $entries->sum('credit'); // purchases
        $totalDebit = $entries->sum('debit');   // payments + returns
        $netPayable = $totalCredit - $totalDebit;

        return [
            'supplier' => $supplier,
            'total_invoiced' => round($totalCredit, 2),
            'total_paid' => round($totalDebit, 2),
            'current_balance' => round($netPayable, 2),
            'ledger' => $entries,
        ];
    }
}

