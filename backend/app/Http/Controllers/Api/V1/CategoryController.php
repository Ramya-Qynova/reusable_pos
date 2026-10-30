<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Products\StoreCategoryRequest;
use App\Http\Requests\Products\UpdateCategoryRequest;
use App\Models\Category;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    use ApiResponse;

    /**
     * List all categories (tree hierarchy or flat list)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Category::query();

        if ($request->boolean('tree')) {
            $categories = $query->root()->with('children')->get();
        } else {
            $categories = $query->with('parent:id,name,slug')->get();
        }

        return $this->successResponse(
            $categories,
            'Categories retrieved successfully.'
        );
    }

    /**
     * Store new category
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category = Category::create($data);

        return $this->successResponse(
            $category->load('parent'),
            'Category created successfully.',
            Response::HTTP_CREATED
        );
    }

    /**
     * Show category details
     */
    public function show(Category $category): JsonResponse
    {
        return $this->successResponse(
            $category->load(['parent', 'children']),
            'Category retrieved successfully.'
        );
    }

    /**
     * Update category
     */
    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $data = $request->validated();
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category->update($data);

        return $this->successResponse(
            $category->fresh(['parent', 'children']),
            'Category updated successfully.'
        );
    }

    /**
     * Delete category
     */
    public function destroy(Category $category): JsonResponse
    {
        if ($category->products()->exists()) {
            return $this->errorResponse(
                'Cannot delete category because it contains active products.',
                Response::HTTP_CONFLICT,
                null,
                'CATEGORY_HAS_PRODUCTS'
            );
        }

        $category->delete();

        return $this->successResponse(
            null,
            'Category deleted successfully.'
        );
    }
}

