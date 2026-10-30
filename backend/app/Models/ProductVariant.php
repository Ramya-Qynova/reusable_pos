<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'variant_sku',
        'variant_barcode',
        'attributes_json',
        'attribute_fingerprint',
        'cost_price',
        'selling_price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'attributes_json' => 'array',
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function (ProductVariant $variant) {
            if (!empty($variant->attributes_json) && is_array($variant->attributes_json)) {
                $variant->attribute_fingerprint = self::generateAttributeFingerprint($variant->attributes_json);
            }
        });
    }

    /**
     * Generate canonical attribute fingerprint to prevent duplicate combinations
     * e.g. {"color": "Red", "size": "L"} and {"size": "l", "color": "red"} yield identical hashes.
     */
    public static function generateAttributeFingerprint(array $attributes): string
    {
        $normalized = [];
        foreach ($attributes as $key => $value) {
            $normalizedKey = strtolower(trim((string) $key));
            $normalizedVal = strtolower(trim((string) $value));
            $normalized[$normalizedKey] = $normalizedVal;
        }
        ksort($normalized);

        return hash('sha256', json_encode($normalized));
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function branchPrices(): HasMany
    {
        return $this->hasMany(BranchProductPrice::class, 'variant_id');
    }
}
