<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSaleRequest;
use App\Services\Sales\SalesService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SaleController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected SalesService $salesService
    ) {}

    /**
     * List sales transactions for active branch.
     */
    public function index(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $filters = $request->only([
            'search',
            'customer_id',
            'payment_status',
            'status',
            'from_date',
            'to_date',
        ]);
        $perPage = (int) $request->input('per_page', 15);

        $sales = $this->salesService->getSales($branch->id, $filters, $perPage);

        return $this->paginatedResponse($sales, 'Sales retrieved successfully.');
    }

    /**
     * Create and record a new POS sale.
     */
    public function store(StoreSaleRequest $request): JsonResponse
    {
        $branch = app('active_branch');
        $user = $request->user();

        $sale = $this->salesService->createSale($request->validated(), $user, $branch);

        return $this->successResponse($sale, 'Sale completed successfully.', Response::HTTP_CREATED);
    }

    /**
     * View sales invoice details.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $branch = app('active_branch');
        $sale = $this->salesService->getSaleById($id, $branch->id);

        return $this->successResponse($sale, 'Sale invoice details retrieved successfully.');
    }

    /**
     * Get aggregate sales summary metrics for the active branch.
     */
    public function summary(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $summary = $this->salesService->getSalesSummary($branch->id, $fromDate, $toDate);

        return $this->successResponse($summary, 'Sales summary retrieved successfully.');
    }

    /**
     * Cancel an existing completed sales order and reverse stock & payments.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $branch = app('active_branch');
        $user = $request->user();
        $reason = $request->input('reason', 'Customer return / order cancelled');

        $sale = $this->salesService->cancelSale($id, $branch->id, $user, $reason);

        return $this->successResponse($sale, 'Sale cancelled and stock reversed successfully.');
    }
}
