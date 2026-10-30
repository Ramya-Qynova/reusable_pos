<?php

namespace App\Http\Requests\Products;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (empty($this->slug) && !empty($this->name)) {
            $this->merge([
                'slug' => \Illuminate\Support\Str::slug($this->name),
            ]);
        }
    }

    public function rules(): array
    {
        $categoryId = $this->route('category')?->id ?? $this->route('category');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'slug' => ['sometimes', 'required', 'string', 'max:120', Rule::unique('categories', 'slug')->ignore($categoryId)],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id', Rule::notIn([$categoryId])],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $category = $this->route('category');
            $parentId = $this->input('parent_id');

            if ($category && $parentId) {
                $categoryModel = $category instanceof Category ? $category : Category::find($category);
                if ($categoryModel) {
                    if ((int) $parentId === (int) $categoryModel->id) {
                        $validator->errors()->add('parent_id', 'A category cannot be its own parent.');
                    } elseif ($categoryModel->isAncestorOf((int) $parentId)) {
                        $validator->errors()->add(
                            'parent_id',
                            'Circular category hierarchy detected. A category cannot select one of its own descendants as its parent.'
                        );
                    }
                }
            }
        });
    }
}
