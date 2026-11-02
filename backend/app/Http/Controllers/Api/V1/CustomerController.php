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
        $details = $this->customerService->getCustomerDetails($customer);

        return $this->successResponse(
            $details,
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

    /**
     * Customer Master dashboard statistics
     */
    public function dashboardStats(): JsonResponse
    {
        $stats = $this->customerService->getDashboardStats();

        return $this->successResponse($stats, 'Customer dashboard statistics retrieved.');
    }

    /**
     * Customer Groups list
     */
    public function groups(): JsonResponse
    {
        $groups = $this->customerService->getCustomerGroups();

        return $this->successResponse($groups, 'Customer groups retrieved.');
    }

    /**
     * Store customer group
     */
    public function storeGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:customer_groups,code',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'credit_limit' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $group = $this->customerService->createCustomerGroup($validated);

        return $this->successResponse($group, 'Customer group created successfully.', Response::HTTP_CREATED);
    }

    /**
     * Update customer group
     */
    public function updateGroup(Request $request, \App\Models\CustomerGroup $group): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:customer_groups,code,' . $group->id,
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'credit_limit' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $updated = $this->customerService->updateCustomerGroup($group, $validated);

        return $this->successResponse($updated, 'Customer group updated successfully.');
    }

    /**
     * Delete customer group
     */
    public function destroyGroup(\App\Models\CustomerGroup $group): JsonResponse
    {
        try {
            $this->customerService->deleteCustomerGroup($group);
            return $this->successResponse(null, 'Customer group deleted successfully.');
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_CONFLICT);
        }
    }

    /**
     * Record payment received against customer credit
     */
    public function recordCreditPayment(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|in:cash,card,bank_transfer,upi,cheque',
            'notes' => 'nullable|string|max:500',
        ]);

        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : null;
        $ledger = $this->customerService->recordCreditPayment($customer, $validated, $request->user()?->id, $branchId);

        return $this->successResponse([
            'customer' => $customer->fresh(),
            'ledger' => $ledger,
        ], 'Customer credit payment recorded successfully.');
    }

    /**
     * Customer Ledger Statement
     */
    public function ledger(Customer $customer, Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date', 'branch_id']);
        if (!$request->has('branch_id') && app()->bound('active_branch')) {
            $filters['branch_id'] = app('active_branch')->id;
        }

        $statement = $this->customerService->getCustomerLedgerStatement($customer, $filters);

        return $this->successResponse($statement, 'Customer ledger statement retrieved.');
    }

    /**
     * Customer bulk import
     */
    public function bulkImport(Request $request): JsonResponse
    {
        $customers = $request->input('customers', []);
        if (empty($customers) || !is_array($customers)) {
            return $this->errorResponse('No valid customers array provided.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $result = $this->customerService->bulkImport($customers, $request->user()?->id);

        return $this->successResponse($result, "Bulk import completed. {$result['imported_count']} imported, {$result['failed_count']} failed.");
    }

    /**
     * Export customer records
     */
    public function bulkExport(): JsonResponse
    {
        $customers = Customer::with('group')->get()->map(function ($c) {
            return [
                'id' => $c->id,
                'customer_code' => $c->customer_code,
                'name' => $c->name,
                'phone' => $c->phone,
                'email' => $c->email,
                'customer_group' => $c->group?->name,
                'customer_type' => $c->customer_type,
                'address' => $c->address,
                'city' => $c->city,
                'state' => $c->state,
                'postal_code' => $c->postal_code,
                'tax_number' => $c->tax_number,
                'credit_limit' => (float) $c->credit_limit,
                'current_balance' => (float) $c->current_balance,
                'loyalty_points' => (int) $c->loyalty_points,
                'is_active' => $c->is_active ? 'Yes' : 'No',
            ];
        });

        return $this->successResponse($customers, 'Customers exported successfully.');
    }
}

