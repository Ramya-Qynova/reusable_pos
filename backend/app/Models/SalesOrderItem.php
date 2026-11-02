<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_order_id',
        'product_id',
        'product_variant_id',
        'product_name',
        'variant_name',
        'sku',
        'barcode',
        'quantity',
        'unit_price',
        'discount_type',
        'discount_rate',
        'discount_amount',
        'tax_slab_id',
        'tax_rate',
        'tax_amount',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'is_tax_inclusive',
        'subtotal',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'discount_rate' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'cgst_amount' => 'decimal:2',
            'sgst_amount' => 'decimal:2',
            'igst_amount' => 'decimal:2',
            'is_tax_inclusive' => 'boolean',
            'subtotal' => 'decimal:2',
            'total' => 'decimal:2',
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

    public function order(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function taxSlab(): BelongsTo
    {
        return $this->belongsTo(TaxSlab::class);
    }
}
