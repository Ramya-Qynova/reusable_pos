<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BranchStock;
use App\Models\StockBatch;
use App\Models\StockTransfer;
use App\Services\Inventory\InventoryService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InventoryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * Inventory summary metrics
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $stats = $this->inventoryService->getDashboardStats($branchId);

        return $this->successResponse($stats, 'Inventory dashboard statistics retrieved.');
    }

    /**
     * Stock overview grouped by branches
     */
    public function overview(): JsonResponse
    {
        $overview = $this->inventoryService->getStockOverview();

        return $this->successResponse($overview, 'Stock overview retrieved.');
    }

    /**
     * Paginated list of inventory stock records
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $perPage = (int) $request->input('per_page', 20);

        $filters = $request->only(['category_id', 'stock_status', 'search']);
        $filters['branch_id'] = $branchId;

        $paginator = $this->inventoryService->getPaginatedStock($filters, $perPage);

        return $this->paginatedResponse($paginator, 'Stock items retrieved successfully.');
    }

    /**
     * Controlled opening stock entry for system setup or new branches.
     */
    public function openingStock(Request $request): JsonResponse
    {
        $activeBranch = app()->has('active_branch') ? app('active_branch') : null;
        $defaultBranchId = $activeBranch?->id ?? (int) $request->header('X-Branch-ID');

        $validated = $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
            'remarks' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
        ]);

        $targetBranchId = !empty($validated['branch_id']) ? (int) $validated['branch_id'] : $defaultBranchId;
        if (!$request->user()->canAccessBranch($targetBranchId)) {
            return $this->errorResponse('Unauthorized branch operation.', Response::HTTP_FORBIDDEN, null, 'BRANCH_ACCESS_DENIED');
        }
        $validated['branch_id'] = $targetBranchId;

        $results = $this->inventoryService->recordOpeningStock($validated, $request->user());

        return $this->successResponse($results, 'Opening stock recorded successfully.', Response::HTTP_CREATED);
    }

    /**
     * Direct stock in
     */
    public function stockIn(Request $request): JsonResponse
    {
        $activeBranch = app()->has('active_branch') ? app('active_branch') : null;
        $defaultBranchId = $activeBranch?->id ?? (int) $request->header('X-Branch-ID');

        $validated = $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer|exists:product_variants,id',
            'quantity' => 'required|numeric|min:0.001',
            'unit_cost' => 'nullable|numeric|min:0',
            'reason' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        $targetBranchId = !empty($validated['branch_id']) ? (int) $validated['branch_id'] : $defaultBranchId;
        if (!$request->user()->canAccessBranch($targetBranchId)) {
            return $this->errorResponse('Unauthorized branch operation.', Response::HTTP_FORBIDDEN, null, 'BRANCH_ACCESS_DENIED');
        }
        $validated['branch_id'] = $targetBranchId;

        $stock = $this->inventoryService->recordStockIn($validated, $request->user());

        return $this->successResponse($stock, 'Stock in recorded successfully.', Response::HTTP_CREATED);
    }

    /**
     * Direct stock out / write-off
     */
    public function stockOut(Request $request): JsonResponse
    {
        $activeBranch = app()->has('active_branch') ? app('active_branch') : null;
        $defaultBranchId = $activeBranch?->id ?? (int) $request->header('X-Branch-ID');

        $validated = $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer|exists:product_variants,id',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        $targetBranchId = !empty($validated['branch_id']) ? (int) $validated['branch_id'] : $defaultBranchId;
        if (!$request->user()->canAccessBranch($targetBranchId)) {
            return $this->errorResponse('Unauthorized branch operation.', Response::HTTP_FORBIDDEN, null, 'BRANCH_ACCESS_DENIED');
        }
        $validated['branch_id'] = $targetBranchId;

        $stock = $this->inventoryService->recordStockOut($validated, $request->user());

        return $this->successResponse($stock, 'Stock out recorded successfully.');
    }

    /**
     * Reason-based stock adjustment
     */
    public function adjust(Request $request): JsonResponse
    {
        $activeBranch = app()->has('active_branch') ? app('active_branch') : null;
        $defaultBranchId = $activeBranch?->id ?? (int) $request->header('X-Branch-ID');

        $validated = $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
            'reason' => 'required|string|max:100',
            'type' => 'required|in:addition,subtraction,damage,physical_count',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.quantity_adjusted' => 'required|numeric',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
        ]);

        $targetBranchId = !empty($validated['branch_id']) ? (int) $validated['branch_id'] : $defaultBranchId;
        if (!$request->user()->canAccessBranch($targetBranchId)) {
            return $this->errorResponse('Unauthorized branch operation.', Response::HTTP_FORBIDDEN, null, 'BRANCH_ACCESS_DENIED');
        }
        $validated['branch_id'] = $targetBranchId;

        $adj = $this->inventoryService->recordStockAdjustment($validated, $request->user());

        return $this->successResponse($adj, 'Stock adjustment recorded successfully.', Response::HTTP_CREATED);
    }

    /**
     * Inter-branch stock transfer creation
     */
    public function createTransfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_branch_id' => 'required|integer|exists:branches,id',
            'destination_branch_id' => 'required|integer|exists:branches,id|different:source_branch_id',
            'status' => 'nullable|string|in:draft,dispatched',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.product_variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.quantity_sent' => 'required|numeric|min:0.001',
            'items.*.notes' => 'nullable|string',
        ]);

        if (!$request->user()->canAccessBranch((int) $validated['source_branch_id'])) {
            return $this->errorResponse('You are not authorized to dispatch stock from the source branch.', Response::HTTP_FORBIDDEN, null, 'BRANCH_ACCESS_DENIED');
        }

        if (empty($validated['status'])) {
            $validated['status'] = 'dispatched';
        }

        $transfer = $this->inventoryService->createStockTransfer($validated, $request->user());

        $message = $transfer->status === 'draft'
            ? 'Stock transfer draft created successfully.'
            : 'Stock transfer dispatched successfully.';

        return $this->successResponse($transfer, $message, Response::HTTP_CREATED);
    }

    /**
     * Dispatch draft stock transfer
     */
    public function dispatchTransfer(StockTransfer $transfer, Request $request): JsonResponse
    {
        if (!$request->user()->canAccessBranch((int) $transfer->source_branch_id)) {
            return $this->errorResponse('You are not authorized to dispatch stock from the source branch.', Response::HTTP_FORBIDDEN, null, 'BRANCH_ACCESS_DENIED');
        }

        $result = $this->inventoryService->dispatchStockTransfer($transfer, $request->user());

        return $this->successResponse($result, 'Stock transfer dispatched successfully.');
    }

    /**
     * List stock transfers
     */
    public function transfers(Request $request): JsonResponse
    {
        $activeBranch = app()->has('active_branch') ? app('active_branch') : null;
        $branchId = $activeBranch?->id ?? (int) $request->header('X-Branch-ID');

        $query = StockTransfer::query()
            ->with(['sourceBranch:id,name,branch_code', 'destinationBranch:id,name,branch_code', 'dispatchedBy:id,name', 'receivedBy:id,name', 'items.product:id,name,sku'])
            ->orderBy('id', 'desc');

        if ($branchId && !$request->user()->is_super_admin) {
            $query->where(function ($q) use ($branchId) {
                $q->where('source_branch_id', $branchId)
                  ->orWhere('destination_branch_id', $branchId);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $transfers = $query->paginate((int) $request->input('per_page', 15));

        return $this->paginatedResponse($transfers, 'Stock transfers retrieved.');
    }

    /**
     * Receive in-transit stock transfer
     */
    public function receiveTransfer(StockTransfer $transfer, Request $request): JsonResponse
    {
        if (!$request->user()->canAccessBranch((int) $transfer->destination_branch_id)) {
            return $this->errorResponse('You are not authorized to receive stock for destination branch.', Response::HTTP_FORBIDDEN, null, 'BRANCH_ACCESS_DENIED');
        }

        $validated = $request->validate([
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|integer',
            'items.*.quantity_received' => 'nullable|numeric|min:0',
            'items.*.damaged_quantity' => 'nullable|numeric|min:0',
        ]);

        $result = $this->inventoryService->receiveStockTransfer($transfer, $request->user(), $validated);

        return $this->successResponse($result, 'Stock transfer received and added to inventory.');
    }

    /**
     * Low stock alerts
     */
    public function lowStockAlerts(Request $request): JsonResponse
    {
        $activeBranch = app()->has('active_branch') ? app('active_branch') : null;
        $branchId = $activeBranch?->id ?? (int) $request->header('X-Branch-ID');

        $alerts = $this->inventoryService->getLowStockAlerts($branchId);

        return $this->successResponse($alerts, 'Low stock alerts retrieved.');
    }

    /**
     * Stock movement audit history
     */
    public function movements(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $filters = $request->only(['product_id', 'movement_type', 'from_date', 'to_date']);
        $filters['branch_id'] = $branchId;

        $movements = $this->inventoryService->getMovementHistory($filters, (int) $request->input('per_page', 20));

        return $this->paginatedResponse($movements, 'Stock movement history retrieved.');
    }

    /**
     * Stock valuation breakdown
     */
    public function valuation(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $valuation = $this->inventoryService->getStockValuation($branchId);

        return $this->successResponse($valuation, 'Stock valuation report generated.');
    }

    /**
     * Batch & Expiry Management
     */
    public function batches(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);

        $query = StockBatch::query()->with(['product:id,name,sku', 'branch:id,name']);
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where('batch_number', 'LIKE', "%{$term}%")
                ->orWhereHas('product', fn ($q) => $q->where('name', 'LIKE', "%{$term}%"));
        }

        $batches = $query->orderBy('expiry_date', 'asc')->paginate((int) $request->input('per_page', 15));

        return $this->paginatedResponse($batches, 'Stock batches retrieved.');
    }

    /**
     * Store new batch
     */
    public function storeBatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer|exists:product_variants,id',
            'batch_number' => 'required|string|max:60',
            'manufacturing_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'quantity' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
        ]);

        $batch = StockBatch::create($validated);

        return $this->successResponse($batch->load('product'), 'Stock batch recorded.', Response::HTTP_CREATED);
    }
}

