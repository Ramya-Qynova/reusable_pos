<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesReturn extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'return_number',
        'sales_order_id',
        'branch_id',
        'customer_id',
        'user_id',
        'cash_register_shift_id',
        'return_date',
        'subtotal',
        'tax_amount',
        'total_amount',
        'refund_method',
        'status',
        'reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'date',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(CashRegisterShift::class, 'cash_register_shift_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesReturnItem::class);
    }

    public function creditNote(): HasMany
    {
        return $this->hasMany(CreditNote::class);
    }
}
