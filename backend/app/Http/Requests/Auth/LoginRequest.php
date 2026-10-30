<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Symfony\Component\HttpFoundation\Response;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required_without:pin_code', 'nullable', 'string', 'email'],
            'password' => ['required_with:email', 'nullable', 'string'],
            'pin_code' => ['required_without:email', 'nullable', 'string', 'min:4', 'max:8'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation failed.',
            'errors' => $validator->errors(),
            'error_code' => 'VALIDATION_FAILED',
        ], Response::HTTP_UNPROCESSABLE_ENTITY));
    }
}

