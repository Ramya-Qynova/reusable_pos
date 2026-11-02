<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected ReportService $reportService
    ) {}

    public function dailySales(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getDailySalesReport(
            $branch->id,
            $request->input('from_date'),
            $request->input('to_date')
        );

        return $this->successResponse($report, 'Daily sales report retrieved.');
    }

    public function salesByProduct(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getSalesByProductReport(
            $branch->id,
            $request->input('from_date'),
            $request->input('to_date'),
            $request->input('category_id') ? (int) $request->input('category_id') : null
        );

        return $this->successResponse($report, 'Sales by product report retrieved.');
    }

    public function salesByCategory(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getSalesByCategoryReport(
            $branch->id,
            $request->input('from_date'),
            $request->input('to_date')
        );

        return $this->successResponse($report, 'Sales by category report retrieved.');
    }

    public function salesByCustomer(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getSalesByCustomerReport(
            $branch->id,
            $request->input('from_date'),
            $request->input('to_date')
        );

        return $this->successResponse($report, 'Sales by customer report retrieved.');
    }

    public function purchases(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getPurchasesReport(
            $branch->id,
            $request->input('from_date'),
            $request->input('to_date')
        );

        return $this->successResponse($report, 'Purchases report retrieved.');
    }

    public function stock(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getStockReport(
            $branch->id,
            $request->input('category_id') ? (int) $request->input('category_id') : null
        );

        return $this->successResponse($report, 'Stock report retrieved.');
    }

    public function lowStock(): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getLowStockReport($branch->id);

        return $this->successResponse($report, 'Low-stock report retrieved.');
    }

    public function stockMovements(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getStockMovementReport($branch->id, $request->all());

        return $this->successResponse($report, 'Stock movement audit report retrieved.');
    }

    public function customerOutstanding(): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getCustomerOutstandingReport($branch->id);

        return $this->successResponse($report, 'Customer outstanding report retrieved.');
    }

    public function supplierOutstanding(): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getSupplierOutstandingReport($branch->id);

        return $this->successResponse($report, 'Supplier outstanding report retrieved.');
    }

    public function profit(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getProfitReport(
            $branch->id,
            $request->input('from_date'),
            $request->input('to_date')
        );

        return $this->successResponse($report, 'Profit report retrieved.');
    }

    public function gst(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $report = $this->reportService->getGstReport(
            $branch->id,
            $request->input('from_date'),
            $request->input('to_date')
        );

        return $this->successResponse($report, 'GST tax report retrieved.');
    }
}
