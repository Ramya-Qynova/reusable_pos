<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'product_id',
        'product_variant_id',
        'movement_type',
        'quantity',
        'previous_quantity',
        'new_quantity',
        'unit_cost',
        'reference_type',
        'reference_id',
        'reason',
        'remarks',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'previous_quantity' => 'decimal:3',
            'new_quantity' => 'decimal:3',
            'unit_cost' => 'decimal:2',
        ];
    }

    public function getVariantIdAttribute(): ?int
    {
        return $this->product_variant_id ? (int) $this->product_variant_id : null;
    }

    public function setVariantIdAttribute($value): void
    {
        $this->attributes['product_variant_id'] = $value;
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

