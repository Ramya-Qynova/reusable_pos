<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BrandController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Brand::query()->withCount('products');

        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where('name', 'LIKE', "%{$term}%")
                ->orWhere('code', 'LIKE', "%{$term}%");
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $brands = $query->orderBy('name')->get();

        return $this->successResponse($brands, 'Brands retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:brands,code',
            'description' => 'nullable|string',
            'logo_url' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $brand = Brand::create([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->successResponse($brand, 'Brand created successfully.', Response::HTTP_CREATED);
    }

    public function show(Brand $brand): JsonResponse
    {
        return $this->successResponse($brand->loadCount('products'), 'Brand retrieved successfully.');
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:brands,code,' . $brand->id,
            'description' => 'nullable|string',
            'logo_url' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $brand->update($validated);

        return $this->successResponse($brand, 'Brand updated successfully.');
    }

    public function destroy(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            return $this->errorResponse('Cannot delete brand because products are assigned to it.', Response::HTTP_CONFLICT);
        }

        $brand->delete();

        return $this->successResponse(null, 'Brand deleted successfully.');
    }
}

