<?php

namespace App\Http\Requests\Products;

use Illuminate\Foundation\Http\FormRequest;

class StoreUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50'],
            'short_code' => ['required', 'string', 'max:10', 'unique:units,short_code'],
            'allow_decimals' => ['required', 'boolean'],
        ];
    }
}

