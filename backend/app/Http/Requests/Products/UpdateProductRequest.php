<?php

namespace App\Http\Requests\Products;

use App\Models\TaxSlab;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productId = $this->route('product')?->id ?? $this->route('product');

        return [
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'unit_id' => ['sometimes', 'required', 'integer', 'exists:units,id'],
            'tax_slab_id' => ['nullable', 'integer', 'exists:tax_slabs,id'],
            'name' => ['sometimes', 'required', 'string', 'max:191'],
            'sku' => ['sometimes', 'required', 'string', 'max:60', Rule::unique('products', 'sku')->ignore($productId)],
            'barcode' => ['nullable', 'string', 'max:60', Rule::unique('products', 'barcode')->ignore($productId)],
            'hsn_code' => ['nullable', 'string', 'max:20'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_tax_inclusive' => ['nullable', 'boolean'],
            'cost_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'minimum_stock' => ['nullable', 'numeric', 'min:0'],
            'has_variants' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
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
        });
    }
}
