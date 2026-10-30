<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'unit_id',
        'tax_slab_id',
        'name',
        'sku',
        'barcode',
        'hsn_code',
        'tax_rate',
        'is_tax_inclusive',
        'cost_price',
        'selling_price',
        'minimum_stock',
        'has_variants',
        'is_active',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'tax_rate' => 'decimal:2',
            'is_tax_inclusive' => 'boolean',
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'minimum_stock' => 'decimal:3',
            'has_variants' => 'boolean',
            'is_active' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function taxSlab(): BelongsTo
    {
        return $this->belongsTo(TaxSlab::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function branchPrices(): HasMany
    {
        return $this->hasMany(BranchProductPrice::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Resolve effective selling price: branch override if present, else master catalog price
     */
    public function getEffectivePrice(int $branchId, ?int $variantId = null): array
    {
        $branchOverride = $this->branchPrices()
            ->where('branch_id', $branchId)
            ->where('variant_id', $variantId)
            ->where('is_active', true)
            ->first();

        if ($branchOverride) {
            return [
                'selling_price' => (float) $branchOverride->selling_price,
                'special_price' => $branchOverride->special_price ? (float) $branchOverride->special_price : null,
                'is_branch_override' => true,
            ];
        }

        // Check variant-level master price
        if ($variantId) {
            $variant = $this->variants()->find($variantId);
            if ($variant) {
                return [
                    'selling_price' => (float) $variant->selling_price,
                    'special_price' => null,
                    'is_branch_override' => false,
                ];
            }
        }

        return [
            'selling_price' => (float) $this->selling_price,
            'special_price' => null,
            'is_branch_override' => false,
        ];
    }
}

