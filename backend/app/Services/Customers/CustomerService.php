<?php

namespace App\Services\Customers;

use App\Models\AuditLog;
use App\Models\Customer;
use DomainException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerService
{
    /**
     * Search and paginate customers with filters
     */
    public function getPaginatedCustomers(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Customer::query();

        if (isset($filters['is_active']) && $filters['is_active'] !== '' && $filters['is_active'] !== null) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['city'])) {
            $query->where('city', 'LIKE', '%' . trim($filters['city']) . '%');
        }

        if (!empty($filters['search'])) {
            $query->search($filters['search']);
        }

        $sortField = $filters['sort_by'] ?? 'name';
        $sortOrder = strtolower($filters['sort_order'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        if (!in_array($sortField, ['name', 'customer_code', 'phone', 'email', 'created_at', 'is_active'])) {
            $sortField = 'name';
        }

        return $query->orderBy($sortField, $sortOrder)->paginate($perPage);
    }

    /**
     * Create customer master record
     */
    public function createCustomer(array $data, ?int $userId = null, ?int $branchId = null): Customer
    {
        return DB::transaction(function () use ($data, $userId, $branchId) {
            if (empty($data['customer_code'])) {
                $data['customer_code'] = $this->generateCustomerCode();
            }

            if (!isset($data['is_active'])) {
                $data['is_active'] = true;
            }

            $customer = Customer::create($data);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'CUSTOMER_CREATED',
                'auditable_type' => Customer::class,
                'auditable_id' => $customer->id,
                'new_values' => $customer->toArray(),
                'created_at' => now(),
            ]);

            return $customer;
        });
    }

    /**
     * Update customer master record
     */
    public function updateCustomer(Customer $customer, array $data, ?int $userId = null, ?int $branchId = null): Customer
    {
        return DB::transaction(function () use ($customer, $data, $userId, $branchId) {
            $oldValues = $customer->toArray();

            $customer->update($data);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'CUSTOMER_UPDATED',
                'auditable_type' => Customer::class,
                'auditable_id' => $customer->id,
                'old_values' => $oldValues,
                'new_values' => $customer->fresh()->toArray(),
                'created_at' => now(),
            ]);

            return $customer->fresh();
        });
    }

    /**
     * Toggle active/inactive status safely
     */
    public function toggleStatus(Customer $customer, ?int $userId = null, ?int $branchId = null): Customer
    {
        return DB::transaction(function () use ($customer, $userId, $branchId) {
            $oldValues = $customer->toArray();
            $customer->update(['is_active' => !$customer->is_active]);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'CUSTOMER_STATUS_CHANGED',
                'auditable_type' => Customer::class,
                'auditable_id' => $customer->id,
                'old_values' => $oldValues,
                'new_values' => $customer->fresh()->toArray(),
                'created_at' => now(),
            ]);

            return $customer->fresh();
        });
    }

    /**
     * Delete customer safely (Soft delete with reference check)
     */
    public function deleteCustomer(Customer $customer, ?int $userId = null, ?int $branchId = null): void
    {
        DB::transaction(function () use ($customer, $userId, $branchId) {
            if ($customer->hasActiveReferences()) {
                throw new DomainException('Cannot delete customer because they are referenced in transactions. You can deactivate this customer instead.');
            }

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'CUSTOMER_DELETED',
                'auditable_type' => Customer::class,
                'auditable_id' => $customer->id,
                'old_values' => $customer->toArray(),
                'created_at' => now(),
            ]);

            $customer->delete();
        });
    }

    /**
     * Auto generate sequential unique customer code
     */
    public function generateCustomerCode(): string
    {
        $maxId = (int) (Customer::withTrashed()->max('id') ?? 0);
        $next = $maxId + 1;
        $code = 'CUST-' . str_pad((string) $next, 5, '0', STR_PAD_LEFT);

        while (Customer::withTrashed()->where('customer_code', $code)->exists()) {
            $next++;
            $code = 'CUST-' . str_pad((string) $next, 5, '0', STR_PAD_LEFT);
        }

        return $code;
    }
}

