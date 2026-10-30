<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_code',
        'name',
        'contact_person',
        'phone',
        'alternate_phone',
        'email',
        'address',
        'city',
        'state',
        'postal_code',
        'tax_number',
        'notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Scope to filter active suppliers
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to search by code, name, contact person, phone, or email
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = trim($term);
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'LIKE', "%{$term}%")
                ->orWhere('supplier_code', 'LIKE', "%{$term}%")
                ->orWhere('contact_person', 'LIKE', "%{$term}%")
                ->orWhere('phone', 'LIKE', "%{$term}%")
                ->orWhere('alternate_phone', 'LIKE', "%{$term}%")
                ->orWhere('email', 'LIKE', "%{$term}%")
                ->orWhere('city', 'LIKE', "%{$term}%");
        });
    }

    /**
     * Check if supplier has dependent transactional references
     */
    public function hasActiveReferences(): bool
    {
        // Future phases checks (e.g. purchase_orders, goods_receipt_notes, supplier_payments)
        if (Schema::hasTable('purchase_orders') && DB::table('purchase_orders')->where('supplier_id', $this->id)->exists()) {
            return true;
        }

        if (Schema::hasTable('goods_receipt_notes') && DB::table('goods_receipt_notes')->where('supplier_id', $this->id)->exists()) {
            return true;
        }

        if (Schema::hasTable('supplier_payments') && DB::table('supplier_payments')->where('supplier_id', $this->id)->exists()) {
            return true;
        }

        return false;
    }
}

