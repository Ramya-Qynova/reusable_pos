<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customers\StoreCustomerRequest;
use App\Http\Requests\Customers\UpdateCustomerRequest;
use App\Models\Customer;
use App\Services\Customers\CustomerService;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CustomerController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CustomerService $customerService
    ) {}

    /**
     * Display a paginated listing of customers with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 15);
        $filters = $request->only(['search', 'is_active', 'city', 'sort_by', 'sort_order']);

        $paginator = $this->customerService->getPaginatedCustomers($filters, $perPage);

        return $this->paginatedResponse(
            $paginator,
            'Customers retrieved successfully.'
        );
    }

    /**
     * Store a newly created customer in storage.
     */
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        $customer = $this->customerService->createCustomer(
            $request->validated(),
            $request->user()?->id,
            $branchId
        );

        return $this->successResponse(
            $customer,
            'Customer created successfully.',
            Response::HTTP_CREATED
        );
    }

    /**
     * Display the specified customer.
     */
    public function show(Customer $customer): JsonResponse
    {
        return $this->successResponse(
            $customer,
            'Customer details retrieved successfully.'
        );
    }

    /**
     * Update the specified customer in storage.
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        $updated = $this->customerService->updateCustomer(
            $customer,
            $request->validated(),
            $request->user()?->id,
            $branchId
        );

        return $this->successResponse(
            $updated,
            'Customer updated successfully.'
        );
    }

    /**
     * Remove the specified customer safely.
     */
    public function destroy(Customer $customer, Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        try {
            $this->customerService->deleteCustomer($customer, $request->user()?->id, $branchId);

            return $this->successResponse(
                null,
                'Customer deleted successfully.'
            );
        } catch (DomainException $e) {
            return $this->errorResponse(
                $e->getMessage(),
                Response::HTTP_CONFLICT,
                null,
                'CUSTOMER_HAS_REFERENCES'
            );
        }
    }

    /**
     * Toggle active/inactive status safely.
     */
    public function toggleStatus(Customer $customer, Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;

        $updated = $this->customerService->toggleStatus($customer, $request->user()?->id, $branchId);

        $statusLabel = $updated->is_active ? 'active' : 'inactive';

        return $this->successResponse(
            $updated,
            "Customer marked as {$statusLabel} successfully."
        );
    }

    /**
     * Return next auto-generated customer code.
     */
    public function nextCode(): JsonResponse
    {
        return $this->successResponse([
            'next_code' => $this->customerService->generateCustomerCode(),
        ], 'Next customer code generated.');
    }
}

