<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegisterShift extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'user_id',
        'opened_at',
        'closed_at',
        'opening_balance',
        'cash_sales_amount',
        'cash_in_amount',
        'cash_out_amount',
        'expected_closing_balance',
        'actual_closing_balance',
        'difference',
        'status',
        'opening_notes',
        'closing_notes',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_balance' => 'decimal:2',
            'cash_sales_amount' => 'decimal:2',
            'cash_in_amount' => 'decimal:2',
            'cash_out_amount' => 'decimal:2',
            'expected_closing_balance' => 'decimal:2',
            'actual_closing_balance' => 'decimal:2',
            'difference' => 'decimal:2',
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

    public function sales(): HasMany
    {
        return $this->hasMany(SalesOrder::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalesPayment::class);
    }

    /**
     * Calculate expected closing cash:
     * Opening balance + Cash sales + Cash In - Cash Out
     */
    public function calculateExpectedBalance(): float
    {
        $opening = (float) $this->opening_balance;
        $cashSales = (float) $this->cash_sales_amount;
        $cashIn = (float) $this->cash_in_amount;
        $cashOut = (float) $this->cash_out_amount;

        return round($opening + $cashSales + $cashIn - $cashOut, 2);
    }
}
