<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_code',
        'customer_group_id',
        'customer_type',
        'name',
        'phone',
        'alternate_phone',
        'email',
        'address',
        'city',
        'state',
        'postal_code',
        'tax_number',
        'credit_limit',
        'opening_balance',
        'current_balance',
        'loyalty_points',
        'notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'credit_limit' => 'decimal:2',
            'opening_balance' => 'decimal:2',
            'current_balance' => 'decimal:2',
            'loyalty_points' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function group()
    {
        return $this->belongsTo(CustomerGroup::class, 'customer_group_id');
    }

    public function ledgers()
    {
        return $this->hasMany(CustomerLedger::class);
    }

    public function loyaltyTransactions()
    {
        return $this->hasMany(CustomerLoyaltyTransaction::class);
    }

    public function salesOrders()
    {
        return $this->hasMany(SalesOrder::class);
    }

    public function returns()
    {
        return $this->hasMany(SalesReturn::class);
    }

    public function creditNotes()
    {
        return $this->hasMany(CreditNote::class);
    }

    /**
     * Scope to filter active customers
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to search by code, name, phone, alternate phone or email
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = trim($term);
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'LIKE', "%{$term}%")
                ->orWhere('customer_code', 'LIKE', "%{$term}%")
                ->orWhere('phone', 'LIKE', "%{$term}%")
                ->orWhere('alternate_phone', 'LIKE', "%{$term}%")
                ->orWhere('email', 'LIKE', "%{$term}%")
                ->orWhere('city', 'LIKE', "%{$term}%");
        });
    }

    /**
     * Check if customer has dependent transactional references
     */
    public function hasActiveReferences(): bool
    {
        if (Schema::hasTable('sales_orders') && DB::table('sales_orders')->where('customer_id', $this->id)->exists()) {
            return true;
        }

        if (Schema::hasTable('customer_ledgers') && DB::table('customer_ledgers')->where('customer_id', $this->id)->exists()) {
            return true;
        }

        if (Schema::hasTable('credit_notes') && DB::table('credit_notes')->where('customer_id', $this->id)->exists()) {
            return true;
        }

        if (Schema::hasTable('customer_credit_ledgers') && DB::table('customer_credit_ledgers')->where('customer_id', $this->id)->exists()) {
            return true;
        }

        return false;
    }
}

