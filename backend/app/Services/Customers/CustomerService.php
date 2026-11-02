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
        $query = Customer::query()->with('group');

        if (isset($filters['is_active']) && $filters['is_active'] !== '' && $filters['is_active'] !== null) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['customer_group_id'])) {
            $query->where('customer_group_id', $filters['customer_group_id']);
        }

        if (!empty($filters['customer_type'])) {
            $query->where('customer_type', $filters['customer_type']);
        }

        if (!empty($filters['city'])) {
            $query->where('city', 'LIKE', '%' . trim($filters['city']) . '%');
        }

        if (!empty($filters['search'])) {
            $query->search($filters['search']);
        }

        $sortField = $filters['sort_by'] ?? 'name';
        $sortOrder = strtolower($filters['sort_order'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        if (!in_array($sortField, ['name', 'customer_code', 'phone', 'email', 'created_at', 'is_active', 'current_balance', 'loyalty_points'])) {
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

    /**
     * Dashboard statistics for Customer Master
     */
    public function getDashboardStats(): array
    {
        $totalCustomers = Customer::count();
        $activeCustomers = Customer::where('is_active', true)->count();
        $totalCreditReceivable = (float) Customer::sum('current_balance');
        $totalLoyaltyPoints = (int) Customer::sum('loyalty_points');
        $totalGroups = \App\Models\CustomerGroup::count();
        $customersWithCredit = Customer::where('current_balance', '>', 0)->count();

        return [
            'total_customers' => $totalCustomers,
            'active_customers' => $activeCustomers,
            'total_credit_receivable' => round($totalCreditReceivable, 2),
            'total_loyalty_points' => $totalLoyaltyPoints,
            'total_groups' => $totalGroups,
            'customers_with_credit' => $customersWithCredit,
        ];
    }

    /**
     * Customer groups CRUD
     */
    public function getCustomerGroups()
    {
        return \App\Models\CustomerGroup::withCount('customers')->orderBy('name')->get();
    }

    public function createCustomerGroup(array $data): \App\Models\CustomerGroup
    {
        if (empty($data['code'])) {
            $data['code'] = strtoupper(Str::slug($data['name']));
        }
        return \App\Models\CustomerGroup::create($data);
    }

    public function updateCustomerGroup(\App\Models\CustomerGroup $group, array $data): \App\Models\CustomerGroup
    {
        $group->update($data);
        return $group->fresh();
    }

    public function deleteCustomerGroup(\App\Models\CustomerGroup $group): void
    {
        if ($group->customers()->exists()) {
            throw new DomainException('Cannot delete customer group because customers belong to it.');
        }
        $group->delete();
    }

    /**
     * Complete Customer Details with ledger and recent orders
     */
    public function getCustomerDetails(Customer $customer): array
    {
        $customer->load(['group', 'ledgers' => fn ($q) => $q->orderBy('id', 'desc')->take(20)]);

        $salesOrders = \App\Models\SalesOrder::where('customer_id', $customer->id)
            ->with(['payments', 'items.product'])
            ->orderBy('id', 'desc')
            ->take(20)
            ->get();

        $loyaltyTransactions = \App\Models\CustomerLoyaltyTransaction::where('customer_id', $customer->id)
            ->orderBy('id', 'desc')
            ->take(20)
            ->get();

        return [
            'customer' => $customer,
            'sales_orders' => $salesOrders,
            'loyalty_transactions' => $loyaltyTransactions,
            'total_invoiced' => round((float) \App\Models\SalesOrder::where('customer_id', $customer->id)->sum('grand_total'), 2),
            'total_paid' => round((float) \App\Models\SalesOrder::where('customer_id', $customer->id)->sum('paid_amount'), 2),
        ];
    }

    /**
     * Record Credit Collection Payment from customer
     */
    public function recordCreditPayment(Customer $customer, array $data, ?int $userId = null, ?int $branchId = null): \App\Models\CustomerLedger
    {
        return DB::transaction(function () use ($customer, $data, $userId, $branchId) {
            $amount = (float) $data['amount'];
            $paymentMethod = $data['payment_method'] ?? 'cash';

            // Deduct receivable balance
            $currentBal = (float) $customer->current_balance;
            $newBal = $currentBal - $amount;
            $customer->current_balance = $newBal;
            $customer->save();

            // Create ledger entry
            $ledger = \App\Models\CustomerLedger::create([
                'customer_id' => $customer->id,
                'branch_id' => $branchId,
                'transaction_type' => 'payment',
                'reference_type' => 'credit_payment',
                'transaction_date' => $data['payment_date'] ?? now()->toDateString(),
                'debit' => 0.00,
                'credit' => $amount,
                'running_balance' => $newBal,
                'notes' => $data['notes'] ?? "Credit payment received via {$paymentMethod}",
            ]);

            return $ledger;
        });
    }

    /**
     * Bulk Import Customers
     */
    public function bulkImport(array $rows, ?int $userId = null): array
    {
        $imported = 0;
        $failed = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                if (empty($row['name']) || empty($row['phone'])) {
                    throw new \InvalidArgumentException("Row " . ($index + 1) . ": Name and Phone are required.");
                }

                $phone = trim($row['phone']);
                if (Customer::where('phone', $phone)->exists()) {
                    throw new \InvalidArgumentException("Row " . ($index + 1) . ": Duplicate phone '{$phone}'.");
                }

                $code = !empty($row['customer_code']) ? $row['customer_code'] : $this->generateCustomerCode();

                $groupId = null;
                if (!empty($row['group'])) {
                    $group = \App\Models\CustomerGroup::firstOrCreate(['name' => $row['group']], ['code' => strtoupper(Str::slug($row['group']))]);
                    $groupId = $group->id;
                }

                Customer::create([
                    'customer_code' => $code,
                    'customer_group_id' => $groupId,
                    'name' => $row['name'],
                    'phone' => $phone,
                    'email' => $row['email'] ?? null,
                    'address' => $row['address'] ?? null,
                    'city' => $row['city'] ?? null,
                    'state' => $row['state'] ?? null,
                    'postal_code' => $row['postal_code'] ?? null,
                    'tax_number' => $row['tax_number'] ?? null,
                    'credit_limit' => isset($row['credit_limit']) ? (float) $row['credit_limit'] : 5000.00,
                    'opening_balance' => isset($row['opening_balance']) ? (float) $row['opening_balance'] : 0.00,
                    'current_balance' => isset($row['opening_balance']) ? (float) $row['opening_balance'] : 0.00,
                    'is_active' => true,
                ]);

                $imported++;
            } catch (\Throwable $e) {
                $failed++;
                $errors[] = $e->getMessage();
            }
        }

        return [
            'imported_count' => $imported,
            'failed_count' => $failed,
            'errors' => $errors,
        ];
    }
}

