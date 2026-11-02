<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GoodsReceiptNote;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseOrder;
use App\Models\PurchasePayment;
use App\Models\PurchaseReturn;
use App\Services\Purchases\PurchaseService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PurchaseController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PurchaseService $purchaseService
    ) {}

    public function dashboardStats(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $stats = $this->purchaseService->getDashboardStats($branchId);

        return $this->successResponse($stats, 'Purchase dashboard statistics retrieved.');
    }

    public function indexOrders(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $filters = $request->only(['supplier_id', 'status', 'from_date', 'to_date', 'search']);
        $filters['branch_id'] = $branchId;

        $orders = $this->purchaseService->getPaginatedOrders($filters, (int) $request->input('per_page', 15));

        return $this->paginatedResponse($orders, 'Purchase orders retrieved.');
    }

    public function storeOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'order_date' => 'nullable|date',
            'expected_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.ordered_quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.discount_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $order = $this->purchaseService->createPurchaseOrder($validated, $request->user());

        return $this->successResponse($order, 'Purchase order created successfully.', Response::HTTP_CREATED);
    }

    public function showOrder(PurchaseOrder $order): JsonResponse
    {
        return $this->successResponse(
            $order->load(['supplier', 'branch', 'user', 'items.product.unit', 'goodsReceipts', 'invoices']),
            'Purchase order retrieved.'
        );
    }

    public function goodsReceipts(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);

        $query = GoodsReceiptNote::query()
            ->with(['supplier:id,name,phone', 'branch:id,name', 'receivedBy:id,name', 'purchaseOrder:id,po_number', 'items.product:id,name,sku'])
            ->orderBy('id', 'desc');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $grns = $query->paginate((int) $request->input('per_page', 15));

        return $this->paginatedResponse($grns, 'Goods receipt notes retrieved.');
    }

    public function storeGoodsReceipt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'purchase_order_id' => 'nullable|integer|exists:purchase_orders,id',
            'supplier_invoice_number' => 'nullable|string|max:100',
            'supplier_invoice_date' => 'nullable|date',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'nullable|integer|exists:purchase_order_items,id',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.received_quantity' => 'required|numeric|min:0.001',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.damaged_quantity' => 'nullable|numeric|min:0',
            'items.*.rejected_quantity' => 'nullable|numeric|min:0',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.batch_number' => 'nullable|string',
            'items.*.expiry_date' => 'nullable|date',
        ]);

        $grn = $this->purchaseService->recordGoodsReceipt($validated, $request->user());

        return $this->successResponse($grn, 'Goods receipt (GRN) processed and accepted stock added to inventory.', Response::HTTP_CREATED);
    }

    public function invoices(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);

        $query = PurchaseInvoice::query()
            ->with(['supplier:id,name,phone,tax_number', 'branch:id,name', 'payments', 'purchaseOrder:id,po_number'])
            ->orderBy('id', 'desc');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->input('payment_status'));
        }

        $invoices = $query->paginate((int) $request->input('per_page', 15));

        return $this->paginatedResponse($invoices, 'Purchase invoices retrieved.');
    }

    public function payments(Request $request): JsonResponse
    {
        $query = PurchasePayment::query()
            ->with(['supplier:id,name', 'invoice:id,invoice_number,total_amount,paid_amount', 'user:id,name'])
            ->orderBy('id', 'desc');

        $payments = $query->paginate((int) $request->input('per_page', 15));

        return $this->paginatedResponse($payments, 'Purchase payments retrieved.');
    }

    public function storePayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_invoice_id' => 'required|integer|exists:purchase_invoices,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'required|in:cash,card,bank_transfer,cheque,upi',
            'transaction_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $payment = $this->purchaseService->recordPayment($validated, $request->user());

        return $this->successResponse($payment, 'Payment recorded and supplier balance updated.', Response::HTTP_CREATED);
    }

    public function returns(Request $request): JsonResponse
    {
        $query = PurchaseReturn::query()
            ->with(['supplier:id,name', 'branch:id,name', 'items.product:id,name,sku', 'user:id,name'])
            ->orderBy('id', 'desc');

        $returns = $query->paginate((int) $request->input('per_page', 15));

        return $this->paginatedResponse($returns, 'Purchase returns retrieved.');
    }

    public function storeReturn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'branch_id' => 'required|integer|exists:branches,id',
            'purchase_invoice_id' => 'nullable|integer|exists:purchase_invoices,id',
            'reason' => 'required|string|max:191',
            'return_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $return = $this->purchaseService->recordPurchaseReturn($validated, $request->user());

        return $this->successResponse($return, 'Purchase return completed and stock adjusted.', Response::HTTP_CREATED);
    }

    public function supplierLedger(int $supplierId): JsonResponse
    {
        $ledger = $this->purchaseService->getSupplierLedger($supplierId);

        return $this->successResponse($ledger, 'Supplier ledger statement retrieved.');
    }
}

