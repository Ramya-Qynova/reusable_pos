<?php

namespace App\Services\Products;

use App\Models\AuditLog;
use App\Models\BranchProductPrice;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductService
{
    /**
     * Search and paginate products with filters
     */
    public function getPaginatedProducts(array $filters, int $perPage = 20, ?int $branchId = null): LengthAwarePaginator
    {
        $query = Product::query()
            ->with(['category:id,name,slug', 'unit:id,name,short_code,allow_decimals', 'variants', 'taxSlab:id,name,rate']);

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'LIKE', "%{$term}%")
                    ->orWhere('sku', 'LIKE', "%{$term}%")
                    ->orWhere('barcode', 'LIKE', "%{$term}%")
                    ->orWhereHas('variants', function ($vq) use ($term) {
                        $vq->where('variant_sku', 'LIKE', "%{$term}%")
                            ->orWhere('variant_barcode', 'LIKE', "%{$term}%");
                    });
            });
        }

        $paginator = $query->orderBy('name')->paginate($perPage);

        // If a branch is specified, append effective pricing
        if ($branchId) {
            $paginator->getCollection()->transform(function (Product $product) use ($branchId) {
                $pricing = $product->getEffectivePrice($branchId);
                $product->effective_price = $pricing['selling_price'];
                $product->is_branch_override = $pricing['is_branch_override'];
                return $product;
            });
        }

        return $paginator;
    }

    /**
     * Create product with optional variants
     */
    public function createProduct(array $data, ?int $userId = null): Product
    {
        return DB::transaction(function () use ($data, $userId) {
            $hasVariants = !empty($data['variants']);
            $data['has_variants'] = $hasVariants;

            // Generate SKU if missing
            if (empty($data['sku'])) {
                $data['sku'] = 'SKU-' . strtoupper(Str::random(8));
            }

            // Sync tax rate from tax slab if slab provided
            if (!empty($data['tax_slab_id']) && empty($data['tax_rate'])) {
                $slab = DB::table('tax_slabs')->find($data['tax_slab_id']);
                if ($slab) {
                    $data['tax_rate'] = $slab->rate;
                }
            }

            $product = Product::create($data);

            if ($hasVariants) {
                foreach ($data['variants'] as $variantData) {
                    $product->variants()->create($variantData);
                }
            }

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'PRODUCT_CREATED',
                'auditable_type' => Product::class,
                'auditable_id' => $product->id,
                'new_values' => $product->toArray(),
                'created_at' => now(),
            ]);

            return $product->load(['category', 'unit', 'variants', 'taxSlab']);
        });
    }

    /**
     * Update product details
     */
    public function updateProduct(Product $product, array $data, ?int $userId = null): Product
    {
        return DB::transaction(function () use ($product, $data, $userId) {
            $oldValues = $product->toArray();

            // Sync tax rate from tax slab if slab updated without explicit tax_rate
            if (!empty($data['tax_slab_id']) && !isset($data['tax_rate'])) {
                $slab = DB::table('tax_slabs')->find($data['tax_slab_id']);
                if ($slab) {
                    $data['tax_rate'] = $slab->rate;
                }
            }

            $product->update($data);

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'PRODUCT_UPDATED',
                'auditable_type' => Product::class,
                'auditable_id' => $product->id,
                'old_values' => $oldValues,
                'new_values' => $product->fresh()->toArray(),
                'created_at' => now(),
            ]);

            return $product->fresh(['category', 'unit', 'variants', 'taxSlab']);
        });
    }

    /**
     * Delete product (Soft delete)
     */
    public function deleteProduct(Product $product, ?int $userId = null): void
    {
        DB::transaction(function () use ($product, $userId) {
            AuditLog::create([
                'user_id' => $userId,
                'action' => 'PRODUCT_DELETED',
                'auditable_type' => Product::class,
                'auditable_id' => $product->id,
                'old_values' => $product->toArray(),
                'created_at' => now(),
            ]);

            $product->delete();
        });
    }

    /**
     * Set or update branch-specific pricing override
     */
    public function setBranchPrice(
        int $branchId,
        Product $product,
        ?int $variantId,
        float $sellingPrice,
        ?float $specialPrice = null,
        bool $isActive = true,
        ?int $userId = null
    ): BranchProductPrice {
        return DB::transaction(function () use ($branchId, $product, $variantId, $sellingPrice, $specialPrice, $isActive, $userId) {
            $branchPrice = BranchProductPrice::updateOrCreate(
                [
                    'branch_id' => $branchId,
                    'product_id' => $product->id,
                    'variant_id' => $variantId,
                ],
                [
                    'selling_price' => $sellingPrice,
                    'special_price' => $specialPrice,
                    'is_active' => $isActive,
                ]
            );

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'BRANCH_PRICE_SET',
                'auditable_type' => BranchProductPrice::class,
                'auditable_id' => $branchPrice->id,
                'new_values' => $branchPrice->toArray(),
                'created_at' => now(),
            ]);

            return $branchPrice;
        });
    }

    /**
     * Fast barcode lookup for POS counter and catalog
     */
    public function lookupByBarcode(string $barcode, ?int $branchId = null): ?array
    {
        // 1. Check direct product barcode
        $product = Product::query()
            ->with(['category:id,name', 'unit:id,name,short_code,allow_decimals', 'taxSlab:id,name,rate'])
            ->where('barcode', $barcode)
            ->first();

        if ($product) {
            $pricing = $branchId ? $product->getEffectivePrice($branchId) : [
                'selling_price' => (float) $product->selling_price,
                'special_price' => null,
                'is_branch_override' => false,
            ];

            return [
                'type' => 'product',
                'product' => $product,
                'variant' => null,
                'selling_price' => $pricing['selling_price'],
                'special_price' => $pricing['special_price'],
                'is_branch_override' => $pricing['is_branch_override'],
            ];
        }

        // 2. Check variant barcode
        $variant = ProductVariant::query()
            ->with(['product.category:id,name', 'product.unit:id,name,short_code,allow_decimals', 'product.taxSlab:id,name,rate'])
            ->where('variant_barcode', $barcode)
            ->first();

        if ($variant && $variant->product) {
            $product = $variant->product;
            $pricing = $branchId ? $product->getEffectivePrice($branchId, $variant->id) : [
                'selling_price' => (float) $variant->selling_price,
                'special_price' => null,
                'is_branch_override' => false,
            ];

            return [
                'type' => 'variant',
                'product' => $product,
                'variant' => $variant,
                'selling_price' => $pricing['selling_price'],
                'special_price' => $pricing['special_price'],
                'is_branch_override' => $pricing['is_branch_override'],
            ];
        }

        return null;
    }
}

