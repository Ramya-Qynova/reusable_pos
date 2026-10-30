<?php

namespace App\Services\Suppliers;

use App\Models\AuditLog;
use App\Models\Supplier;
use DomainException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SupplierService
{
    /**
     * Search and paginate suppliers with filters
     */
    public function getPaginatedSuppliers(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Supplier::query();

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

        if (!in_array($sortField, ['name', 'supplier_code', 'contact_person', 'phone', 'email', 'created_at', 'is_active'])) {
            $sortField = 'name';
        }

        return $query->orderBy($sortField, $sortOrder)->paginate($perPage);
    }

    /**
     * Create supplier master record
     */
    public function createSupplier(array $data, ?int $userId = null, ?int $branchId = null): Supplier
    {
        return DB::transaction(function () use ($data, $userId, $branchId) {
            if (empty($data['supplier_code'])) {
                $data['supplier_code'] = $this->generateSupplierCode();
            }

            if (!isset($data['is_active'])) {
                $data['is_active'] = true;
            }

            $supplier = Supplier::create($data);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'SUPPLIER_CREATED',
                'auditable_type' => Supplier::class,
                'auditable_id' => $supplier->id,
                'new_values' => $supplier->toArray(),
                'created_at' => now(),
            ]);

            return $supplier;
        });
    }

    /**
     * Update supplier master record
     */
    public function updateSupplier(Supplier $supplier, array $data, ?int $userId = null, ?int $branchId = null): Supplier
    {
        return DB::transaction(function () use ($supplier, $data, $userId, $branchId) {
            $oldValues = $supplier->toArray();

            $supplier->update($data);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'SUPPLIER_UPDATED',
                'auditable_type' => Supplier::class,
                'auditable_id' => $supplier->id,
                'old_values' => $oldValues,
                'new_values' => $supplier->fresh()->toArray(),
                'created_at' => now(),
            ]);

            return $supplier->fresh();
        });
    }

    /**
     * Toggle active/inactive status safely
     */
    public function toggleStatus(Supplier $supplier, ?int $userId = null, ?int $branchId = null): Supplier
    {
        return DB::transaction(function () use ($supplier, $userId, $branchId) {
            $oldValues = $supplier->toArray();
            $supplier->update(['is_active' => !$supplier->is_active]);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'SUPPLIER_STATUS_CHANGED',
                'auditable_type' => Supplier::class,
                'auditable_id' => $supplier->id,
                'old_values' => $oldValues,
                'new_values' => $supplier->fresh()->toArray(),
                'created_at' => now(),
            ]);

            return $supplier->fresh();
        });
    }

    /**
     * Delete supplier safely (Soft delete with reference check)
     */
    public function deleteSupplier(Supplier $supplier, ?int $userId = null, ?int $branchId = null): void
    {
        DB::transaction(function () use ($supplier, $userId, $branchId) {
            if ($supplier->hasActiveReferences()) {
                throw new DomainException('Cannot delete supplier because they are referenced in purchase or payment records. You can deactivate this supplier instead.');
            }

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'SUPPLIER_DELETED',
                'auditable_type' => Supplier::class,
                'auditable_id' => $supplier->id,
                'old_values' => $supplier->toArray(),
                'created_at' => now(),
            ]);

            $supplier->delete();
        });
    }

    /**
     * Auto generate sequential unique supplier code
     */
    public function generateSupplierCode(): string
    {
        $maxId = (int) (Supplier::withTrashed()->max('id') ?? 0);
        $next = $maxId + 1;
        $code = 'SUP-' . str_pad((string) $next, 5, '0', STR_PAD_LEFT);

        while (Supplier::withTrashed()->where('supplier_code', $code)->exists()) {
            $next++;
            $code = 'SUP-' . str_pad((string) $next, 5, '0', STR_PAD_LEFT);
        }

        return $code;
    }
}

