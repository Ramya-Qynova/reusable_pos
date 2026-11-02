<?php

namespace App\Services\Reports;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Category;
use App\Models\Customer;
use App\Models\GoodsReceiptNote;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesPayment;
use App\Models\SalesReturn;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * 1. Daily Sales Report
     */
    public function getDailySalesReport(int $branchId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?? now()->startOfMonth()->toDateString();
        $toDate = $toDate ?? now()->toDateString();

        $orders = SalesOrder::where('branch_id', $branchId)
            ->where('status', 'completed')
            ->whereDate('order_date', '>=', $fromDate)
            ->whereDate('order_date', '<=', $toDate)
            ->with('payments')
            ->orderBy('order_date', 'asc')
            ->get();

        $dailyGroups = $orders->groupBy(function ($o) {
            return Carbon::parse($o->order_date)->toDateString();
        });

        $dailyData = [];
        $totalOrders = 0;
        $totalSubtotal = 0.0;
        $totalDiscount = 0.0;
        $totalTax = 0.0;
        $totalRoundOff = 0.0;
        $totalGrandTotal = 0.0;
        $totalCash = 0.0;
        $totalUpi = 0.0;
        $totalCard = 0.0;
        $totalOther = 0.0;

        foreach ($dailyGroups as $date => $dayOrders) {
            $count = $dayOrders->count();
            $sub = (float) $dayOrders->sum('subtotal');
            $disc = (float) $dayOrders->sum('discount_amount');
            $tax = (float) $dayOrders->sum('tax_amount');
            $round = (float) $dayOrders->sum('round_off');
            $grand = (float) $dayOrders->sum('grand_total');

            $allPayments = $dayOrders->flatMap->payments->where('status', 'successful');
            $cash = (float) $allPayments->where('payment_method', 'cash')->sum('amount');
            $upi = (float) $allPayments->where('payment_method', 'upi')->sum('amount');
            $card = (float) $allPayments->where('payment_method', 'card')->sum('amount');
            $other = (float) $allPayments->whereNotIn('payment_method', ['cash', 'upi', 'card'])->sum('amount');

            $totalOrders += $count;
            $totalSubtotal += $sub;
            $totalDiscount += $disc;
            $totalTax += $tax;
            $totalRoundOff += $round;
            $totalGrandTotal += $grand;
            $totalCash += $cash;
            $totalUpi += $upi;
            $totalCard += $card;
            $totalOther += $other;

            $dailyData[] = [
                'date' => $date,
                'bills_count' => $count,
                'subtotal' => round($sub, 2),
                'discount' => round($disc, 2),
                'tax' => round($tax, 2),
                'round_off' => round($round, 2),
                'grand_total' => round($grand, 2),
                'cash_amount' => round($cash, 2),
                'upi_amount' => round($upi, 2),
                'card_amount' => round($card, 2),
                'other_amount' => round($other, 2),
            ];
        }

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'summary' => [
                'total_orders' => $totalOrders,
                'total_subtotal' => round($totalSubtotal, 2),
                'total_discount' => round($totalDiscount, 2),
                'total_tax' => round($totalTax, 2),
                'total_round_off' => round($totalRoundOff, 2),
                'total_grand_total' => round($totalGrandTotal, 2),
                'payment_breakdown' => [
                    'cash' => round($totalCash, 2),
                    'upi' => round($totalUpi, 2),
                    'card' => round($totalCard, 2),
                    'other' => round($totalOther, 2),
                ],
            ],
            'daily_records' => $dailyData,
        ];
    }

    /**
     * 2. Sales by Product Report
     */
    public function getSalesByProductReport(int $branchId, ?string $fromDate = null, ?string $toDate = null, ?int $categoryId = null): array
    {
        $fromDate = $fromDate ?? now()->startOfMonth()->toDateString();
        $toDate = $toDate ?? now()->toDateString();

        $itemsQuery = SalesOrderItem::whereHas('salesOrder', function ($q) use ($branchId, $fromDate, $toDate) {
            $q->where('branch_id', $branchId)
                ->where('status', 'completed')
                ->whereDate('order_date', '>=', $fromDate)
                ->whereDate('order_date', '<=', $toDate);
        })->with(['product.category', 'variant']);

        if ($categoryId) {
            $itemsQuery->whereHas('product', fn ($pq) => $pq->where('category_id', $categoryId));
        }

        $items = $itemsQuery->get();

        $grouped = $items->groupBy(function ($it) {
            return $it->product_id . '_' . ($it->product_variant_id ?? '0');
        });

        $productData = [];
        $overallQuantity = 0.0;
        $overallRevenue = 0.0;

        foreach ($grouped as $key => $groupItems) {
            $first = $groupItems->first();
            $qty = (float) $groupItems->sum('quantity');
            $rev = (float) $groupItems->sum('total');

            $overallQuantity += $qty;
            $overallRevenue += $rev;

            $productData[] = [
                'product_id' => $first->product_id,
                'variant_id' => $first->product_variant_id,
                'product_name' => $first->product_name,
                'variant_name' => $first->variant_name,
                'sku' => $first->sku,
                'barcode' => $first->barcode,
                'category' => $first->product?->category?->name ?? 'Uncategorized',
                'quantity_sold' => round($qty, 3),
                'total_revenue' => round($rev, 2),
                'average_selling_price' => $qty > 0 ? round($rev / $qty, 2) : 0.00,
            ];
        }

        usort($productData, fn ($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'total_quantity_sold' => round($overallQuantity, 3),
            'total_revenue' => round($overallRevenue, 2),
            'products' => $productData,
        ];
    }

    /**
     * 3. Sales by Category Report
     */
    public function getSalesByCategoryReport(int $branchId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?? now()->startOfMonth()->toDateString();
        $toDate = $toDate ?? now()->toDateString();

        $items = SalesOrderItem::whereHas('salesOrder', function ($q) use ($branchId, $fromDate, $toDate) {
            $q->where('branch_id', $branchId)
                ->where('status', 'completed')
                ->whereDate('order_date', '>=', $fromDate)
                ->whereDate('order_date', '<=', $toDate);
        })->with('product.category')->get();

        $grouped = $items->groupBy(function ($it) {
            return $it->product?->category_id ?? 0;
        });

        $totalRevenue = (float) $items->sum('total');
        $categoryData = [];

        foreach ($grouped as $catId => $groupItems) {
            $first = $groupItems->first();
            $catName = $first->product?->category?->name ?? 'Uncategorized';
            $qty = (float) $groupItems->sum('quantity');
            $rev = (float) $groupItems->sum('total');
            $pct = $totalRevenue > 0 ? round(($rev / $totalRevenue) * 100, 2) : 0.0;

            $categoryData[] = [
                'category_id' => $catId ?: null,
                'category_name' => $catName,
                'items_count' => $groupItems->count(),
                'quantity_sold' => round($qty, 3),
                'total_revenue' => round($rev, 2),
                'revenue_percentage' => $pct,
            ];
        }

        usort($categoryData, fn ($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'total_revenue' => round($totalRevenue, 2),
            'categories' => $categoryData,
        ];
    }

    /**
     * 4. Sales by Customer Report
     */
    public function getSalesByCustomerReport(int $branchId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?? now()->startOfMonth()->toDateString();
        $toDate = $toDate ?? now()->toDateString();

        $orders = SalesOrder::where('branch_id', $branchId)
            ->where('status', 'completed')
            ->whereDate('order_date', '>=', $fromDate)
            ->whereDate('order_date', '<=', $toDate)
            ->with('customer')
            ->get();

        $grouped = $orders->groupBy(function ($o) {
            return $o->customer_id ?? 0;
        });

        $customerData = [];
        $totalInvoiced = 0.0;
        $totalPaid = 0.0;

        foreach ($grouped as $custId => $groupOrders) {
            $first = $groupOrders->first();
            $isWalkIn = empty($custId);
            $inv = (float) $groupOrders->sum('grand_total');
            $paid = (float) $groupOrders->sum('paid_amount');

            $totalInvoiced += $inv;
            $totalPaid += $paid;

            $customerData[] = [
                'customer_id' => $isWalkIn ? null : $custId,
                'customer_code' => $isWalkIn ? 'WALK-IN' : $first->customer?->customer_code,
                'customer_name' => $isWalkIn ? 'Walk-in Customer' : $first->customer?->name,
                'phone' => $isWalkIn ? '-' : $first->customer?->phone,
                'orders_count' => $groupOrders->count(),
                'total_invoiced' => round($inv, 2),
                'total_paid' => round($paid, 2),
                'outstanding_balance' => $isWalkIn ? 0.00 : (float) ($first->customer?->current_balance ?? 0),
            ];
        }

        usort($customerData, fn ($a, $b) => $b['total_invoiced'] <=> $a['total_invoiced']);

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'total_invoiced' => round($totalInvoiced, 2),
            'total_paid' => round($totalPaid, 2),
            'customers' => $customerData,
        ];
    }

    /**
     * 5. Purchase Report
     */
    public function getPurchasesReport(int $branchId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?? now()->startOfMonth()->toDateString();
        $toDate = $toDate ?? now()->toDateString();

        $invoices = PurchaseInvoice::where('branch_id', $branchId)
            ->whereDate('invoice_date', '>=', $fromDate)
            ->whereDate('invoice_date', '<=', $toDate)
            ->with(['supplier', 'payments'])
            ->orderBy('invoice_date', 'desc')
            ->get();

        $totalInvoiced = (float) $invoices->sum('total_amount');
        $totalPaid = (float) $invoices->sum('paid_amount');
        $pendingPayable = round($totalInvoiced - $totalPaid, 2);

        $supplierSummary = $invoices->groupBy('supplier_id')->map(function ($sinv) {
            $first = $sinv->first();
            return [
                'supplier_id' => $first->supplier_id,
                'supplier_name' => $first->supplier?->name ?? 'Unknown',
                'invoices_count' => $sinv->count(),
                'total_amount' => round((float) $sinv->sum('total_amount'), 2),
                'paid_amount' => round((float) $sinv->sum('paid_amount'), 2),
                'due_amount' => round((float) $sinv->sum('total_amount') - (float) $sinv->sum('paid_amount'), 2),
            ];
        })->values();

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'summary' => [
                'total_invoices' => $invoices->count(),
                'total_invoiced' => round($totalInvoiced, 2),
                'total_paid' => round($totalPaid, 2),
                'pending_payable' => $pendingPayable,
            ],
            'by_supplier' => $supplierSummary,
            'invoices' => $invoices->map(fn ($inv) => [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'supplier' => $inv->supplier?->name,
                'date' => $inv->invoice_date,
                'total_amount' => (float) $inv->total_amount,
                'paid_amount' => (float) $inv->paid_amount,
                'payment_status' => $inv->payment_status,
            ]),
        ];
    }

    /**
     * 6. Stock Report (Current inventory & valuation)
     */
    public function getStockReport(int $branchId, ?int $categoryId = null): array
    {
        $query = BranchStock::where('branch_id', $branchId)
            ->with(['product.category', 'product.unit', 'variant']);

        if ($categoryId) {
            $query->whereHas('product', fn ($pq) => $pq->where('category_id', $categoryId));
        }

        $stocks = $query->get();

        $totalQty = 0.0;
        $totalDamaged = 0.0;
        $totalCostValuation = 0.0;
        $totalRetailValuation = 0.0;

        $items = [];
        foreach ($stocks as $st) {
            $p = $st->product;
            if (!$p) continue;

            $qty = (float) $st->quantity;
            $damaged = (float) $st->damaged_quantity;
            $cost = (float) ($st->variant?->cost_price ?: $p->cost_price);
            $retail = (float) ($st->variant?->selling_price ?: $p->selling_price);

            $costVal = round($qty * $cost, 2);
            $retailVal = round($qty * $retail, 2);

            $totalQty += $qty;
            $totalDamaged += $damaged;
            $totalCostValuation += $costVal;
            $totalRetailValuation += $retailVal;

            $items[] = [
                'product_id' => $p->id,
                'variant_id' => $st->variant_id,
                'product_name' => $p->name,
                'variant_name' => $st->variant?->attribute_summary ?? null,
                'sku' => $st->variant?->variant_sku ?? $p->sku,
                'category' => $p->category?->name ?? 'Uncategorized',
                'unit' => $p->unit?->short_code ?? 'pcs',
                'quantity' => $qty,
                'damaged_quantity' => $damaged,
                'cost_price' => $cost,
                'selling_price' => $retail,
                'valuation_at_cost' => $costVal,
                'valuation_at_retail' => $retailVal,
            ];
        }

        return [
            'summary' => [
                'total_products_tracked' => count($items),
                'total_stock_quantity' => round($totalQty, 3),
                'total_damaged_quantity' => round($totalDamaged, 3),
                'total_valuation_at_cost' => round($totalCostValuation, 2),
                'total_valuation_at_retail' => round($totalRetailValuation, 2),
            ],
            'stocks' => $items,
        ];
    }

    /**
     * 7. Low-Stock Alert Report
     */
    public function getLowStockReport(int $branchId): array
    {
        $stocks = BranchStock::where('branch_id', $branchId)
            ->with(['product.category', 'product.unit', 'variant'])
            ->get();

        $alerts = [];
        foreach ($stocks as $st) {
            $p = $st->product;
            if (!$p) continue;

            $minStock = (float) $p->minimum_stock;
            $currStock = (float) $st->quantity;

            if ($currStock <= $minStock) {
                $alerts[] = [
                    'product_id' => $p->id,
                    'variant_id' => $st->variant_id,
                    'product_name' => $p->name,
                    'variant_name' => $st->variant?->attribute_summary ?? null,
                    'sku' => $st->variant?->variant_sku ?? $p->sku,
                    'category' => $p->category?->name ?? 'Uncategorized',
                    'current_stock' => $currStock,
                    'minimum_stock' => $minStock,
                    'shortage' => round(max(0, $minStock - $currStock), 3),
                    'unit' => $p->unit?->short_code ?? 'pcs',
                    'status' => $currStock <= 0 ? 'Out of Stock' : 'Low Stock',
                ];
            }
        }

        usort($alerts, fn ($a, $b) => $a['current_stock'] <=> $b['current_stock']);

        return [
            'total_alerts' => count($alerts),
            'low_stock_items' => $alerts,
        ];
    }

    /**
     * 8. Stock Movement Report
     */
    public function getStockMovementReport(int $branchId, array $filters = []): array
    {
        $query = StockMovement::where('branch_id', $branchId)
            ->with(['product', 'user'])
            ->latest('created_at');

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }
        if (!empty($filters['movement_type'])) {
            $query->where('movement_type', $filters['movement_type']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('product_id', (int) $filters['product_id']);
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        $paginated = $query->paginate($perPage);

        return [
            'movements' => $paginated->map(fn ($m) => [
                'id' => $m->id,
                'date' => $m->created_at->toIso8601String(),
                'product_name' => $m->product?->name ?? 'Unknown Product',
                'movement_type' => $m->movement_type,
                'quantity' => (float) $m->quantity,
                'previous_quantity' => (float) $m->previous_quantity,
                'new_quantity' => (float) $m->new_quantity,
                'reference_type' => $m->reference_type,
                'reference_id' => $m->reference_id,
                'reason' => $m->reason,
                'performed_by' => $m->user?->name ?? 'System',
            ]),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ];
    }

    /**
     * 9. Customer Outstanding Balance Report
     */
    public function getCustomerOutstandingReport(int $branchId): array
    {
        $customers = Customer::where('current_balance', '>', 0)
            ->with('group')
            ->orderBy('current_balance', 'desc')
            ->get();

        $totalReceivable = (float) $customers->sum('current_balance');

        return [
            'summary' => [
                'customers_with_dues_count' => $customers->count(),
                'total_credit_receivable' => round($totalReceivable, 2),
            ],
            'customers' => $customers->map(fn ($c) => [
                'customer_id' => $c->id,
                'customer_code' => $c->customer_code,
                'name' => $c->name,
                'phone' => $c->phone,
                'group' => $c->group?->name,
                'credit_limit' => (float) $c->credit_limit,
                'outstanding_balance' => (float) $c->current_balance,
                'available_credit' => max(0, round((float) $c->credit_limit - (float) $c->current_balance, 2)),
            ]),
        ];
    }

    /**
     * 10. Supplier Outstanding Balance Report
     */
    public function getSupplierOutstandingReport(int $branchId): array
    {
        $suppliers = Supplier::where('is_active', true)->with('ledgers')->get();

        $supplierBalances = [];
        $totalLiability = 0.0;

        foreach ($suppliers as $sup) {
            $lastBal = (float) ($sup->ledgers()->latest('id')->value('running_balance') ?? 0);
            if ($lastBal > 0) {
                $totalLiability += $lastBal;
                $supplierBalances[] = [
                    'supplier_id' => $sup->id,
                    'supplier_code' => $sup->supplier_code,
                    'name' => $sup->name,
                    'phone' => $sup->phone,
                    'outstanding_payable' => round($lastBal, 2),
                ];
            }
        }

        usort($supplierBalances, fn ($a, $b) => $b['outstanding_payable'] <=> $a['outstanding_payable']);

        return [
            'summary' => [
                'suppliers_with_dues_count' => count($supplierBalances),
                'total_payable_liability' => round($totalLiability, 2),
            ],
            'suppliers' => $supplierBalances,
        ];
    }

    /**
     * 11. Profit & Loss Report
     */
    public function getProfitReport(int $branchId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?? now()->startOfMonth()->toDateString();
        $toDate = $toDate ?? now()->toDateString();

        $items = SalesOrderItem::whereHas('salesOrder', function ($q) use ($branchId, $fromDate, $toDate) {
            $q->where('branch_id', $branchId)
                ->where('status', 'completed')
                ->whereDate('order_date', '>=', $fromDate)
                ->whereDate('order_date', '<=', $toDate);
        })->with(['product', 'variant'])->get();

        $totalRevenue = 0.0;
        $totalCogs = 0.0;

        foreach ($items as $it) {
            $lineRev = (float) $it->subtotal; // revenue net of line tax
            $cost = (float) ($it->variant?->cost_price ?: $it->product?->cost_price ?: 0.0);
            $lineCogs = (float) $it->quantity * $cost;

            $totalRevenue += $lineRev;
            $totalCogs += $lineCogs;
        }

        $grossProfit = round($totalRevenue - $totalCogs, 2);
        $profitMargin = $totalRevenue > 0 ? round(($grossProfit / $totalRevenue) * 100, 2) : 0.0;

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'revenue' => round($totalRevenue, 2),
            'cost_of_goods_sold' => round($totalCogs, 2),
            'gross_profit' => $grossProfit,
            'gross_margin_percentage' => $profitMargin,
        ];
    }

    /**
     * 12. GST Report (Tax Liability & Tax Incurred)
     */
    public function getGstReport(int $branchId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?? now()->startOfMonth()->toDateString();
        $toDate = $toDate ?? now()->toDateString();

        // 1. Output GST from Sales Orders
        $sales = SalesOrder::where('branch_id', $branchId)
            ->where('status', 'completed')
            ->whereDate('order_date', '>=', $fromDate)
            ->whereDate('order_date', '<=', $toDate)
            ->get();

        $salesTaxable = (float) $sales->sum('subtotal');
        $outputCgst = (float) $sales->sum('cgst_amount');
        $outputSgst = (float) $sales->sum('sgst_amount');
        $outputIgst = (float) $sales->sum('igst_amount');
        $totalOutputGst = (float) $sales->sum('tax_amount');

        // 2. Input GST from Purchase Invoices
        $purchases = PurchaseInvoice::where('branch_id', $branchId)
            ->whereDate('invoice_date', '>=', $fromDate)
            ->whereDate('invoice_date', '<=', $toDate)
            ->get();

        $purchaseTaxable = (float) $purchases->sum('subtotal');
        $totalInputGst = (float) $purchases->sum('tax_amount');

        // Net GST Liability = Output GST - Input GST
        $netGstLiability = round($totalOutputGst - $totalInputGst, 2);

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'output_gst' => [
                'taxable_sales' => round($salesTaxable, 2),
                'cgst_amount' => round($outputCgst, 2),
                'sgst_amount' => round($outputSgst, 2),
                'igst_amount' => round($outputIgst, 2),
                'total_output_gst' => round($totalOutputGst, 2),
            ],
            'input_gst' => [
                'taxable_purchases' => round($purchaseTaxable, 2),
                'total_input_gst' => round($totalInputGst, 2),
            ],
            'net_gst_liability' => $netGstLiability,
        ];
    }
}
