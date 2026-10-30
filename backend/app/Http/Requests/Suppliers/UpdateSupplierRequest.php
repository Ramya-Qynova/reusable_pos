<?php

namespace App\Http\Requests\Suppliers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $supplierId = $this->route('supplier') instanceof \App\Models\Supplier
            ? $this->route('supplier')->id
            : $this->route('supplier');

        return [
            'supplier_code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('suppliers', 'supplier_code')->ignore($supplierId),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:191'],
            'contact_person' => ['nullable', 'string', 'max:191'],
            'phone' => ['sometimes', 'required', 'string', 'max:30'],
            'alternate_phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:191'],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}

