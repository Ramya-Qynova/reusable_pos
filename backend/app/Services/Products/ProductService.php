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
            ->with([
                'category:id,name,slug',
                'brand:id,name,code',
                'unit:id,name,short_code,allow_decimals',
                'variants',
                'taxSlab:id,name,rate',
                'stocks' => function ($sq) use ($branchId) {
                    if ($branchId) {
                        $sq->where('branch_id', $branchId);
                    }
                },
            ]);

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
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

        // If a branch is specified, append effective pricing and stock summary
        if ($branchId) {
            $paginator->getCollection()->transform(function (Product $product) use ($branchId) {
                $pricing = $product->getEffectivePrice($branchId);
                $product->effective_price = $pricing['selling_price'];
                $product->is_branch_override = $pricing['is_branch_override'];
                
                $stockRecord = $product->stocks->firstWhere('branch_id', $branchId);
                $product->stock_quantity = $stockRecord ? (float) $stockRecord->quantity : 0.000;
                $product->damaged_stock_quantity = $stockRecord ? (float) $stockRecord->damaged_quantity : 0.000;

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
            ->with(['category:id,name', 'brand:id,name', 'unit:id,name,short_code,allow_decimals', 'taxSlab:id,name,rate'])
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
            ->with(['product.category:id,name', 'product.brand:id,name', 'product.unit:id,name,short_code,allow_decimals', 'product.taxSlab:id,name,rate'])
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

    /**
     * Get aggregate product catalog metrics
     */
    public function getDashboardStats(?int $branchId = null): array
    {
        $totalProducts = Product::count();
        $activeProducts = Product::where('is_active', true)->count();
        $totalCategories = \App\Models\Category::count();
        $totalBrands = \App\Models\Brand::count();
        $totalUnits = \App\Models\Unit::count();

        // Calculate low stock and out of stock based on branch_stocks if available
        $lowStockCount = 0;
        $outOfStockCount = 0;

        $products = Product::with(['stocks' => function ($sq) use ($branchId) {
            if ($branchId) {
                $sq->where('branch_id', $branchId);
            }
        }])->get();

        foreach ($products as $prod) {
            $stockQty = $branchId 
                ? (float) ($prod->stocks->firstWhere('branch_id', $branchId)?->quantity ?? 0)
                : (float) $prod->stocks->sum('quantity');

            if ($stockQty <= 0) {
                $outOfStockCount++;
            } elseif ($stockQty <= (float) $prod->minimum_stock) {
                $lowStockCount++;
            }
        }

        return [
            'total_products' => $totalProducts,
            'active_products' => $activeProducts,
            'total_categories' => $totalCategories,
            'total_brands' => $totalBrands,
            'total_units' => $totalUnits,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
        ];
    }

    /**
     * Generate unique barcode (e.g. EAN13 or code128 prefix)
     */
    public function generateUniqueBarcode(string $symbology = 'CODE128'): string
    {
        $prefix = \App\Models\AppSetting::get('barcode_prefix', 'GM');
        
        do {
            if (strtoupper($symbology) === 'EAN13') {
                // Generate 12 digits + checksum
                $digits = '890' . str_pad((string) random_int(100000000, 999999999), 9, '0', STR_PAD_LEFT);
                $checksum = $this->calculateEan13Checksum($digits);
                $code = $digits . $checksum;
            } else {
                $code = $prefix . date('y') . str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            }
            $exists = Product::where('barcode', $code)->exists() || ProductVariant::where('variant_barcode', $code)->exists();
        } while ($exists);

        return $code;
    }

    private function calculateEan13Checksum(string $digits): int
    {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $digit = (int) $digits[$i];
            $sum += ($i % 2 === 0) ? $digit : $digit * 3;
        }
        $remainder = $sum % 10;
        return ($remainder === 0) ? 0 : 10 - $remainder;
    }

    /**
     * Bulk import products
     */
    public function bulkImport(array $rows, ?int $userId = null): array
    {
        $imported = 0;
        $failed = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                if (empty($row['name'])) {
                    throw new \InvalidArgumentException("Row " . ($index + 1) . ": Product Name is required.");
                }

                $sku = !empty($row['sku']) ? $row['sku'] : 'SKU-' . strtoupper(Str::random(8));
                if (Product::where('sku', $sku)->exists()) {
                    throw new \InvalidArgumentException("Row " . ($index + 1) . ": Duplicate SKU '{$sku}'.");
                }

                $barcode = !empty($row['barcode']) ? $row['barcode'] : null;
                if ($barcode && Product::where('barcode', $barcode)->exists()) {
                    throw new \InvalidArgumentException("Row " . ($index + 1) . ": Duplicate Barcode '{$barcode}'.");
                }

                $category = !empty($row['category_id']) 
                    ? \App\Models\Category::find($row['category_id']) 
                    : \App\Models\Category::firstOrCreate(['name' => $row['category'] ?? 'General'], ['slug' => Str::slug($row['category'] ?? 'general')]);

                $unit = !empty($row['unit_id']) 
                    ? \App\Models\Unit::find($row['unit_id']) 
                    : \App\Models\Unit::firstOrCreate(['short_code' => $row['unit'] ?? 'pcs'], ['name' => $row['unit'] ?? 'Pieces', 'allow_decimals' => false]);

                $brandId = !empty($row['brand_id']) ? (int) $row['brand_id'] : null;
                if (!$brandId && !empty($row['brand'])) {
                    $brand = Brand::firstOrCreate(['name' => $row['brand']], ['code' => 'BR-' . strtoupper(Str::random(4))]);
                    $brandId = $brand->id;
                }

                $costPrice = isset($row['cost_price']) ? (float) $row['cost_price'] : 0.00;
                $sellingPrice = isset($row['selling_price']) ? (float) $row['selling_price'] : ($costPrice * 1.2);
                $mrp = isset($row['mrp']) ? (float) $row['mrp'] : ($sellingPrice * 1.1);

                $product = Product::create([
                    'category_id' => $category->id,
                    'unit_id' => $unit->id,
                    'brand_id' => $brandId,
                    'name' => $row['name'],
                    'sku' => $sku,
                    'barcode' => $barcode,
                    'hsn_code' => $row['hsn_code'] ?? null,
                    'tax_rate' => isset($row['tax_rate']) ? (float) $row['tax_rate'] : 0.00,
                    'cost_price' => $costPrice,
                    'selling_price' => $sellingPrice,
                    'mrp' => $mrp,
                    'minimum_stock' => isset($row['minimum_stock']) ? (float) $row['minimum_stock'] : 5.000,
                    'description' => $row['description'] ?? null,
                    'is_active' => true,
                ]);

                // Create initial branch stock if specified
                if (!empty($row['initial_stock'])) {
                    \App\Models\BranchStock::updateOrCreate(
                        ['branch_id' => 1, 'product_id' => $product->id, 'variant_id' => null],
                        ['quantity' => (float) $row['initial_stock']]
                    );
                }

                $imported++;
            } catch (\Throwable $e) {
                $failed++;
                $errors[] = $e->getMessage();
            }
        }

        return [
            'imported_count' => $imported,
            'failed_count' => $failed,
            'errors' => $errors,
        ];
    }
}

