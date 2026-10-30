<?php

namespace App\Http\Requests\Products;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $unitId = $this->route('unit')?->id ?? $this->route('unit');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:50'],
            'short_code' => ['sometimes', 'required', 'string', 'max:10', Rule::unique('units', 'short_code')->ignore($unitId)],
            'allow_decimals' => ['sometimes', 'required', 'boolean'],
        ];
    }
}

