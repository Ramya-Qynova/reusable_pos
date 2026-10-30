<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Suppliers\StoreSupplierRequest;
use App\Http\Requests\Suppliers\UpdateSupplierRequest;
use App\Models\Supplier;
use App\Services\Suppliers\SupplierService;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SupplierController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected SupplierService $supplierService
    ) {}

    /**
     * Display a paginated listing of suppliers with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 15);
        $filters = $request->only(['search', 'is_active', 'city', 'sort_by', 'sort_order']);

        $paginator = $this->supplierService->getPaginatedSuppliers($filters, $perPage);

        return $this->paginatedResponse(
            $paginator,
            'Suppliers retrieved successfully.'
        );
    }

    /**
     * Store a newly created supplier in storage.
     */
    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        $supplier = $this->supplierService->createSupplier(
            $request->validated(),
            $request->user()?->id,
            $branchId
        );

        return $this->successResponse(
            $supplier,
            'Supplier created successfully.',
            Response::HTTP_CREATED
        );
    }

    /**
     * Display the specified supplier.
     */
    public function show(Supplier $supplier): JsonResponse
    {
        return $this->successResponse(
            $supplier,
            'Supplier details retrieved successfully.'
        );
    }

    /**
     * Update the specified supplier in storage.
     */
    public function update(UpdateSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        $updated = $this->supplierService->updateSupplier(
            $supplier,
            $request->validated(),
            $request->user()?->id,
            $branchId
        );

        return $this->successResponse(
            $updated,
            'Supplier updated successfully.'
        );
    }

    /**
     * Remove the specified supplier safely.
     */
    public function destroy(Supplier $supplier, Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        try {
            $this->supplierService->deleteSupplier($supplier, $request->user()?->id, $branchId);

            return $this->successResponse(
                null,
                'Supplier deleted successfully.'
            );
        } catch (DomainException $e) {
            return $this->errorResponse(
                $e->getMessage(),
                Response::HTTP_CONFLICT,
                null,
                'SUPPLIER_HAS_REFERENCES'
            );
        }
    }

    /**
     * Toggle active/inactive status safely.
     */
    public function toggleStatus(Supplier $supplier, Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        $updated = $this->supplierService->toggleStatus($supplier, $request->user()?->id, $branchId);

        $statusLabel = $updated->is_active ? 'active' : 'inactive';

        return $this->successResponse(
            $updated,
            "Supplier marked as {$statusLabel} successfully."
        );
    }

    /**
     * Return next auto-generated supplier code.
     */
    public function nextCode(): JsonResponse
    {
        return $this->successResponse([
            'next_code' => $this->supplierService->generateSupplierCode(),
        ], 'Next supplier code generated.');
    }
}

