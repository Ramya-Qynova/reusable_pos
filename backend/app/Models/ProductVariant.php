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

    public function branchStocks(): HasMany
    {
        return $this->hasMany(BranchStock::class, 'variant_id');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(SalesOrderItem::class, 'product_variant_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'product_variant_id');
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(StockBatch::class, 'variant_id');
    }

    public function adjustmentItems(): HasMany
    {
        return $this->hasMany(StockAdjustmentItem::class, 'variant_id');
    }

    public function transferItems(): HasMany
    {
        return $this->hasMany(StockTransferItem::class, 'variant_id');
    }

    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'variant_id');
    }

    public function goodsReceiptItems(): HasMany
    {
        return $this->hasMany(GoodsReceiptItem::class, 'variant_id');
    }

    public function purchaseReturnItems(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class, 'variant_id');
    }

    public function salesReturnItems(): HasMany
    {
        return $this->hasMany(SalesReturnItem::class, 'variant_id');
    }
}
