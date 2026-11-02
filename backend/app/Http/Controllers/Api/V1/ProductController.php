<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Products\SetBranchPriceRequest;
use App\Http\Requests\Products\StoreProductRequest;
use App\Http\Requests\Products\UpdateProductRequest;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\TaxSlab;
use App\Models\Unit;
use App\Services\Products\ProductService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProductController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected ProductService $productService
    ) {}

    /**
     * Get initial catalog metadata (categories, units, tax slabs, branches) in a single fast call.
     */
    public function meta(): JsonResponse
    {
        $categories = Category::query()->with('parent:id,name,slug')->get();
        $units = Unit::query()->orderBy('name')->get();
        $taxSlabs = TaxSlab::query()->get();
        $branches = Branch::query()->where('is_active', true)->get(['id', 'name', 'branch_code', 'location', 'is_main_branch']);
        $brands = \App\Models\Brand::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        return $this->successResponse([
            'categories' => $categories,
            'units' => $units,
            'tax_slabs' => $taxSlabs,
            'branches' => $branches,
            'brands' => $brands,
        ], 'Catalog metadata retrieved successfully.');
    }

    /**
     * Display a listing of products with optional branch pricing and search.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $perPage = (int) $request->input('per_page', 20);

        $paginator = $this->productService->getPaginatedProducts(
            $request->only(['category_id', 'is_active', 'search']),
            $perPage,
            $branchId
        );

        return $this->paginatedResponse(
            $paginator,
            'Products retrieved successfully.'
        );
    }

    /**
     * Store a newly created product.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->createProduct(
            $request->validated(),
            $request->user()?->id
        );

        return $this->successResponse(
            $product,
            'Product created successfully.',
            Response::HTTP_CREATED
        );
    }

    /**
     * Display the specified product.
     */
    public function show(Product $product, Request $request): JsonResponse
    {
        $product->load(['category', 'unit', 'taxSlab', 'variants', 'branchPrices.branch:id,name,branch_code']);

        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        if ($branchId) {
            $pricing = $product->getEffectivePrice($branchId);
            $product->effective_price = $pricing['selling_price'];
            $product->is_branch_override = $pricing['is_branch_override'];
        }

        return $this->successResponse(
            $product,
            'Product retrieved successfully.'
        );
    }

    /**
     * Update the specified product.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $updatedProduct = $this->productService->updateProduct(
            $product,
            $request->validated(),
            $request->user()?->id
        );

        return $this->successResponse(
            $updatedProduct,
            'Product updated successfully.'
        );
    }

    /**
     * Remove the specified product (soft-delete).
     */
    public function destroy(Product $product, Request $request): JsonResponse
    {
        $this->productService->deleteProduct($product, $request->user()?->id);

        return $this->successResponse(
            null,
            'Product deleted successfully.'
        );
    }

    /**
     * Quick barcode lookup for POS counter or catalog scanner.
     */
    public function barcodeLookup(string $barcode, Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);

        $result = $this->productService->lookupByBarcode($barcode, $branchId);

        if (!$result) {
            return $this->errorResponse(
                "No active product found matching barcode '{$barcode}'.",
                Response::HTTP_NOT_FOUND,
                null,
                'PRODUCT_NOT_FOUND'
            );
        }

        return $this->successResponse(
            $result,
            'Product lookup successful.'
        );
    }

    /**
     * Set or override branch-specific selling price.
     */
    public function setBranchPrice(SetBranchPriceRequest $request, Product $product): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // 1. Authorize user for the requested branch
        if (!$user || !$user->canAccessBranch((int) $data['branch_id'])) {
            return $this->errorResponse(
                "You are not authorized to configure pricing for branch ID [{$data['branch_id']}].",
                Response::HTTP_FORBIDDEN,
                null,
                'BRANCH_ACCESS_DENIED'
            );
        }

        // 2. Validate permission to manage catalog/pricing in that branch
        if (!$user->hasPermission('catalog.manage', (int) $data['branch_id'])) {
            return $this->errorResponse(
                'You do not possess the required permission to modify branch pricing.',
                Response::HTTP_FORBIDDEN,
                null,
                'PERMISSION_DENIED'
            );
        }

        // 3. Validate product and variant relationship
        if (!empty($data['variant_id'])) {
            $variantBelongs = $product->variants()->where('id', $data['variant_id'])->exists();
            if (!$variantBelongs) {
                return $this->errorResponse(
                    "The specified variant [ID: {$data['variant_id']}] does not belong to product [ID: {$product->id}].",
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                    null,
                    'INVALID_VARIANT_FOR_PRODUCT'
                );
            }
        }

        $branchPrice = $this->productService->setBranchPrice(
            branchId: (int) $data['branch_id'],
            product: $product,
            variantId: isset($data['variant_id']) ? (int) $data['variant_id'] : null,
            sellingPrice: (float) $data['selling_price'],
            specialPrice: isset($data['special_price']) ? (float) $data['special_price'] : null,
            isActive: $data['is_active'] ?? true,
            userId: $user->id
        );

        return $this->successResponse(
            $branchPrice->load(['branch:id,name,branch_code', 'variant']),
            'Branch price configured successfully.'
        );
    }

    /**
     * Get aggregate statistics for product dashboard
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);
        $stats = $this->productService->getDashboardStats($branchId);

        return $this->successResponse($stats, 'Product dashboard statistics retrieved successfully.');
    }

    /**
     * Generate unique barcode with symbology
     */
    public function generateBarcode(Request $request): JsonResponse
    {
        $symbology = $request->input('symbology', 'CODE128');
        $barcode = $this->productService->generateUniqueBarcode($symbology);

        return $this->successResponse([
            'barcode' => $barcode,
            'symbology' => $symbology,
        ], 'Barcode generated successfully.');
    }

    /**
     * Bulk import products from array or JSON
     */
    public function bulkImport(Request $request): JsonResponse
    {
        $products = $request->input('products', []);
        if (empty($products) || !is_array($products)) {
            return $this->errorResponse('No valid products array provided for bulk import.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $result = $this->productService->bulkImport($products, $request->user()?->id);

        return $this->successResponse($result, "Bulk import completed. {$result['imported_count']} imported, {$result['failed_count']} failed.");
    }

    /**
     * Export products as flat structure
     */
    public function bulkExport(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : ($request->input('branch_id') ? (int) $request->input('branch_id') : null);

        $products = Product::with(['category', 'brand', 'unit', 'stocks' => function ($sq) use ($branchId) {
            if ($branchId) {
                $sq->where('branch_id', $branchId);
            }
        }])->get()->map(function ($p) use ($branchId) {
            $stockQty = $branchId ? (float) ($p->stocks->firstWhere('branch_id', $branchId)?->quantity ?? 0) : (float) $p->stocks->sum('quantity');
            return [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'barcode' => $p->barcode,
                'category' => $p->category?->name,
                'brand' => $p->brand?->name,
                'unit' => $p->unit?->short_code,
                'cost_price' => (float) $p->cost_price,
                'selling_price' => (float) $p->selling_price,
                'mrp' => (float) $p->mrp,
                'tax_rate' => (float) $p->tax_rate,
                'minimum_stock' => (float) $p->minimum_stock,
                'current_stock' => $stockQty,
                'is_active' => $p->is_active ? 'Yes' : 'No',
            ];
        });

        return $this->successResponse($products, 'Products exported successfully.');
    }
}

