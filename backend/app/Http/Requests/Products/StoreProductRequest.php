<?php

namespace App\Http\Requests\Products;

use App\Models\ProductVariant;
use App\Models\TaxSlab;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'tax_slab_id' => ['nullable', 'integer', 'exists:tax_slabs,id'],
            'name' => ['required', 'string', 'max:191'],
            'sku' => ['required', 'string', 'max:60', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:60', 'unique:products,barcode'],
            'hsn_code' => ['nullable', 'string', 'max:20'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_tax_inclusive' => ['nullable', 'boolean'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'mrp' => ['nullable', 'numeric', 'min:0'],
            'minimum_stock' => ['nullable', 'numeric', 'min:0'],
            'has_variants' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'metadata' => ['nullable', 'array'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'max:500'],

            // Nested variants
            'variants' => ['nullable', 'array'],
            'variants.*.variant_sku' => ['required_with:variants', 'string', 'max:60', 'distinct', 'unique:product_variants,variant_sku'],
            'variants.*.variant_barcode' => ['nullable', 'string', 'max:60', 'distinct', 'unique:product_variants,variant_barcode'],
            'variants.*.attributes_json' => ['required_with:variants', 'array'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.selling_price' => ['required_with:variants', 'numeric', 'min:0'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // 1. Tax consistency verification
            $taxSlabId = $this->input('tax_slab_id');
            $taxRate = $this->input('tax_rate');

            if (!empty($taxSlabId) && $taxRate !== null && $taxRate !== '') {
                $slab = TaxSlab::find($taxSlabId);
                if ($slab && abs((float) $taxRate - (float) $slab->rate) > 0.001) {
                    $validator->errors()->add(
                        'tax_rate',
                        "The specified tax rate ({$taxRate}%) contradicts the selected tax slab [{$slab->name}] rate of {$slab->rate}%."
                    );
                }
            }

            // 2. Variant attribute uniqueness verification
            $variants = $this->input('variants', []);
            if (!empty($variants) && is_array($variants)) {
                $seenFingerprints = [];
                foreach ($variants as $index => $variant) {
                    if (!empty($variant['attributes_json']) && is_array($variant['attributes_json'])) {
                        $fingerprint = ProductVariant::generateAttributeFingerprint($variant['attributes_json']);
                        if (in_array($fingerprint, $seenFingerprints, true)) {
                            $validator->errors()->add(
                                "variants.{$index}.attributes_json",
                                'Duplicate attribute combination detected. Each variant of a product must have a unique combination of attributes.'
                            );
                        }
                        $seenFingerprints[] = $fingerprint;
                    }
                }
            }
        });
    }
}
