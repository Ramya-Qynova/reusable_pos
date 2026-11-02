<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'product_id',
        'variant_id',
        'quantity',
        'damaged_quantity',
        'reserved_quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'damaged_quantity' => 'decimal:3',
            'reserved_quantity' => 'decimal:3',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (BranchStock $stock) {
            $query = static::where('branch_id', $stock->branch_id)
                ->where('product_id', $stock->product_id);

            if ($stock->exists) {
                $query->where('id', '!=', $stock->id);
            }

            if (!empty($stock->variant_id)) {
                $query->where('variant_id', $stock->variant_id);
            } else {
                $query->whereNull('variant_id');
            }

            if ($query->exists()) {
                throw new \DomainException("A duplicate branch stock record cannot be created for branch #{$stock->branch_id}, product #{$stock->product_id}, variant " . ($stock->variant_id ?? 'base') . ".");
            }
        });
    }

    public function getProductVariantIdAttribute(): ?int
    {
        return $this->variant_id ? (int) $this->variant_id : null;
    }

    public function setProductVariantIdAttribute($value): void
    {
        $this->attributes['variant_id'] = $value;
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
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}

