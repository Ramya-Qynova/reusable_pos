<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'order_date' => ['nullable', 'date'],
            'is_gst_bill' => ['nullable', 'boolean'],
            'enable_rounding' => ['nullable', 'boolean'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],
            'client_reference' => ['nullable', 'string', 'max:100'],
            'metadata' => ['nullable', 'array'],
            'discount_type' => ['nullable', 'string', 'in:fixed,percentage'],
            'discount_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.discount_type' => ['nullable', 'string', 'in:fixed,percentage'],
            'items.*.discount_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            // Payment options
            'payments' => ['nullable', 'array'],
            'payments.*.payment_method' => ['required_with:payments', 'string', 'in:cash,card,upi,other,Cash,Card,UPI,Other'],
            'payments.*.amount' => ['required_with:payments', 'numeric', 'gt:0'],
            'payments.*.payment_reference' => ['nullable', 'string', 'max:100'],
            'payment_method' => ['nullable', 'string'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
        ];
    }
}
