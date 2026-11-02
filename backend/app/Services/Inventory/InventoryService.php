<?php

namespace App\Services\Inventory;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\BusinessFeature;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    /**
     * Dashboard statistics for Inventory
     */
    public function getDashboardStats(?int $branchId = null): array
    {
        $stockQuery = BranchStock::query()->with('product');
        if ($branchId) {
            $stockQuery->where('branch_id', $branchId);
        }

        $stocks = $stockQuery->get();

        $totalValuationCost = 0.0;
        $totalValuationRetail = 0.0;
        $totalStockUnits = 0.0;
        $damagedUnits = 0.0;
        $lowStockCount = 0;
        $outOfStockCount = 0;

        foreach ($stocks as $stock) {
            $qty = (float) $stock->quantity;
            $damaged = (float) $stock->damaged_quantity;
            $prod = $stock->product;

            $totalStockUnits += $qty;
            $damagedUnits += $damaged;

            if ($prod) {
                $cost = (float) $prod->cost_price;
                $sell = (float) $prod->selling_price;
                $totalValuationCost += ($qty * $cost);
                $totalValuationRetail += ($qty * $sell);

                if ($qty <= 0) {
                    $outOfStockCount++;
                } elseif ($qty <= (float) $prod->minimum_stock) {
                    $lowStockCount++;
                }
            }
        }

        return [
            'total_valuation_cost' => round($totalValuationCost, 2),
            'total_valuation_retail' => round($totalValuationRetail, 2),
            'potential_profit' => round($totalValuationRetail - $totalValuationCost, 2),
            'total_stock_units' => round($totalStockUnits, 3),
            'damaged_units' => round($damagedUnits, 3),
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'total_tracked_products' => $stocks->unique('product_id')->count(),
        ];
    }

    /**
     * Stock overview grouped by branch
     */
    public function getStockOverview(): array
    {
        $branches = Branch::where('is_active', true)->get();
        $overview = [];

        foreach ($branches as $branch) {
            $stocks = BranchStock::where('branch_id', $branch->id)->with('product')->get();
            $totalUnits = 0.0;
            $totalCost = 0.0;
            $lowStockItems = 0;
            $outOfStockItems = 0;

            foreach ($stocks as $stk) {
                $qty = (float) $stk->quantity;
                $totalUnits += $qty;
                if ($stk->product) {
                    $totalCost += ($qty * (float) $stk->product->cost_price);
                    if ($qty <= 0) {
                        $outOfStockItems++;
                    } elseif ($qty <= (float) $stk->product->minimum_stock) {
                        $lowStockItems++;
                    }
                }
            }

            $overview[] = [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'branch_code' => $branch->branch_code,
                'location' => $branch->location,
                'total_products' => $stocks->count(),
                'total_units' => round($totalUnits, 3),
                'total_valuation_cost' => round($totalCost, 2),
                'low_stock_items' => $lowStockItems,
                'out_of_stock_items' => $outOfStockItems,
            ];
        }

        return $overview;
    }

    /**
     * Paginated Stock List with filters
     */
    public function getPaginatedStock(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = BranchStock::query()
            ->with(['product.category', 'product.brand', 'product.unit', 'branch:id,name,branch_code', 'variant']);

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (!empty($filters['category_id'])) {
            $query->whereHas('product', function ($q) use ($filters) {
                $q->where('category_id', $filters['category_id']);
            });
        }

        if (!empty($filters['stock_status'])) {
            if ($filters['stock_status'] === 'out') {
                $query->where('quantity', '<=', 0);
            } elseif ($filters['stock_status'] === 'low') {
                $query->whereRaw('quantity > 0 AND quantity <= (SELECT minimum_stock FROM products WHERE products.id = branch_stocks.product_id)');
            } elseif ($filters['stock_status'] === 'damaged') {
                $query->where('damaged_quantity', '>', 0);
            } elseif ($filters['stock_status'] === 'in_stock') {
                $query->whereRaw('quantity > (SELECT minimum_stock FROM products WHERE products.id = branch_stocks.product_id)');
            }
        }

        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->whereHas('product', function ($q) use ($term) {
                $q->where('name', 'LIKE', "%{$term}%")
                    ->orWhere('sku', 'LIKE', "%{$term}%")
                    ->orWhere('barcode', 'LIKE', "%{$term}%");
            });
        }

        return $query->orderBy('quantity', 'asc')->paginate($perPage);
    }

    /**
     * Pessimistic row-locking helper for branch stock record.
     */
    protected function getLockedStock(int $branchId, int $productId, ?int $variantId = null): BranchStock
    {
        BranchStock::firstOrCreate(
            ['branch_id' => $branchId, 'product_id' => $productId, 'variant_id' => $variantId],
            ['quantity' => 0.000, 'damaged_quantity' => 0.000, 'reserved_quantity' => 0.000]
        );

        $query = BranchStock::where('branch_id', $branchId)
            ->where('product_id', $productId);

        if ($variantId) {
            $query->where('variant_id', $variantId);
        } else {
            $query->whereNull('variant_id');
        }

        return $query->lockForUpdate()->firstOrFail();
    }

    /**
     * Validate quantity against unit decimal configuration rules.
     */
    protected function validateUnitDecimals(Product $product, float $quantity): void
    {
        $product->loadMissing('unit');
        if ($product->unit && !$product->unit->allow_decimals && floor($quantity) != $quantity) {
            throw ValidationException::withMessages([
                'quantity' => ["Fractional / decimal quantity is not permitted for product [{$product->name}] using unit [{$product->unit->name}]."]
            ]);
        }
    }

    /**
     * Record Controlled Opening Stock Entry
     * Prevents accidental duplicate opening stock initialization.
     */
    public function recordOpeningStock(array $data, User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = (int) $data['branch_id'];
            $remarks = $data['remarks'] ?? 'Initial branch opening stock';
            $results = [];

            foreach ($data['items'] as $item) {
                $productId = (int) $item['product_id'];
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $quantity = (float) $item['quantity'];
                $unitCost = !empty($item['unit_cost']) ? (float) $item['unit_cost'] : 0.0;

                $product = Product::with('unit')->findOrFail($productId);
                $this->validateUnitDecimals($product, $quantity);

                // Check for duplicate opening stock
                $query = StockMovement::where('branch_id', $branchId)
                    ->where('product_id', $productId)
                    ->where('movement_type', 'initial');

                if ($variantId) {
                    $query->where('product_variant_id', $variantId);
                } else {
                    $query->whereNull('product_variant_id');
                }

                if ($query->exists()) {
                    throw ValidationException::withMessages([
                        'items' => ["Opening stock has already been initialized for [{$product->name}] at this branch."]
                    ]);
                }

                $stock = $this->getLockedStock($branchId, $productId, $variantId);
                $prevQty = (float) $stock->quantity;
                $newQty = $prevQty + $quantity;
                $stock->quantity = $newQty;
                $stock->save();

                StockMovement::create([
                    'branch_id' => $branchId,
                    'product_id' => $productId,
                    'product_variant_id' => $variantId,
                    'movement_type' => 'initial',
                    'quantity' => $quantity,
                    'previous_quantity' => $prevQty,
                    'new_quantity' => $newQty,
                    'unit_cost' => $unitCost ?: (float) $product->cost_price,
                    'reference_type' => 'opening_stock',
                    'reason' => 'Opening Stock Setup',
                    'remarks' => $remarks,
                    'user_id' => $user->id,
                ]);

                $results[] = $stock->fresh(['product', 'branch']);
            }

            return $results;
        });
    }

    /**
     * Record Direct Stock In (e.g. stock receipt, direct delivery)
     */
    public function recordStockIn(array $data, User $user): BranchStock
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = (int) $data['branch_id'];
            $productId = (int) $data['product_id'];
            $variantId = !empty($data['variant_id']) ? (int) $data['variant_id'] : null;
            $quantity = (float) $data['quantity'];
            $unitCost = !empty($data['unit_cost']) ? (float) $data['unit_cost'] : 0.0;
            $remarks = $data['remarks'] ?? 'Direct stock in';

            $product = Product::with('unit')->findOrFail($productId);
            $this->validateUnitDecimals($product, $quantity);

            $stock = $this->getLockedStock($branchId, $productId, $variantId);

            $prevQty = (float) $stock->quantity;
            $newQty = $prevQty + $quantity;
            $stock->quantity = $newQty;
            $stock->save();

            StockMovement::create([
                'branch_id' => $branchId,
                'product_id' => $productId,
                'product_variant_id' => $variantId,
                'movement_type' => 'stock_in',
                'quantity' => $quantity,
                'previous_quantity' => $prevQty,
                'new_quantity' => $newQty,
                'unit_cost' => $unitCost ?: (float) $product->cost_price,
                'reference_type' => 'direct_stock_in',
                'reason' => $data['reason'] ?? 'Manual Stock In',
                'remarks' => $remarks,
                'user_id' => $user->id,
            ]);

            return $stock->fresh(['product', 'branch']);
        });
    }

    /**
     * Record Direct Stock Out / Issue
     */
    public function recordStockOut(array $data, User $user): BranchStock
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = (int) $data['branch_id'];
            $productId = (int) $data['product_id'];
            $variantId = !empty($data['variant_id']) ? (int) $data['variant_id'] : null;
            $quantity = (float) $data['quantity'];
            $remarks = $data['remarks'] ?? 'Stock issued / write-off';

            $product = Product::with('unit')->findOrFail($productId);
            $this->validateUnitDecimals($product, $quantity);

            $stock = $this->getLockedStock($branchId, $productId, $variantId);

            $allowNegative = (bool) BusinessFeature::where('feature_key', 'allow_negative_stock')->value('is_enabled');
            $prevQty = (float) $stock->quantity;

            if (!$allowNegative && $prevQty < $quantity) {
                throw ValidationException::withMessages([
                    'quantity' => ["Insufficient stock for [{$product->name}]. Available: {$prevQty}, Requested: {$quantity}."]
                ]);
            }

            $newQty = $prevQty - $quantity;
            $stock->quantity = $newQty;
            $stock->save();

            StockMovement::create([
                'branch_id' => $branchId,
                'product_id' => $productId,
                'product_variant_id' => $variantId,
                'movement_type' => 'stock_out',
                'quantity' => -$quantity,
                'previous_quantity' => $prevQty,
                'new_quantity' => $newQty,
                'unit_cost' => (float) $product->cost_price,
                'reference_type' => 'stock_out',
                'reason' => $data['reason'] ?? 'Manual Stock Out',
                'remarks' => $remarks,
                'user_id' => $user->id,
            ]);

            return $stock->fresh(['product', 'branch']);
        });
    }

    /**
     * Record Reason-based Stock Adjustment
     */
    public function recordStockAdjustment(array $data, User $user): StockAdjustment
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = (int) $data['branch_id'];
            $adjNumber = 'ADJ-' . date('Ymd') . '-' . strtoupper(Str::random(5));
            $type = $data['type'] ?? 'addition';

            $adjustment = StockAdjustment::create([
                'adjustment_number' => $adjNumber,
                'branch_id' => $branchId,
                'user_id' => $user->id,
                'reason' => $data['reason'],
                'type' => $type,
                'notes' => $data['notes'] ?? null,
            ]);

            $allowNegative = (bool) BusinessFeature::where('feature_key', 'allow_negative_stock')->value('is_enabled');

            foreach ($data['items'] as $item) {
                $productId = (int) $item['product_id'];
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $adjQty = (float) $item['quantity_adjusted'];
                $unitCost = !empty($item['unit_cost']) ? (float) $item['unit_cost'] : 0.0;

                $product = Product::with('unit')->findOrFail($productId);
                $this->validateUnitDecimals($product, abs($adjQty));

                $stock = $this->getLockedStock($branchId, $productId, $variantId);
                $prevQty = (float) $stock->quantity;

                if ($type === 'damage') {
                    $deductQty = abs($adjQty);
                    if (!$allowNegative && $prevQty < $deductQty) {
                        throw ValidationException::withMessages([
                            'items' => ["Insufficient stock to record damage for [{$product->name}]. Available: {$prevQty}, Damaged: {$deductQty}"]
                        ]);
                    }
                    $newQty = $prevQty - $deductQty;
                    $stock->quantity = $newQty;
                    $stock->damaged_quantity = (float) $stock->damaged_quantity + $deductQty;
                    $movementType = 'damage';
                    $movementQty = -$deductQty;
                } elseif ($type === 'subtraction') {
                    $deductQty = abs($adjQty);
                    if (!$allowNegative && $prevQty < $deductQty) {
                        throw ValidationException::withMessages([
                            'items' => ["Insufficient stock for adjustment subtraction of [{$product->name}]. Available: {$prevQty}, Requested: {$deductQty}"]
                        ]);
                    }
                    $newQty = $prevQty - $deductQty;
                    $stock->quantity = $newQty;
                    $movementType = 'adjustment_out';
                    $movementQty = -$deductQty;
                } elseif ($type === 'physical_count') {
                    $diff = $adjQty - $prevQty;
                    if (!$allowNegative && $adjQty < 0) {
                        throw ValidationException::withMessages([
                            'items' => ["Count correction cannot result in negative stock for [{$product->name}]."]
                        ]);
                    }
                    $newQty = $adjQty;
                    $stock->quantity = $newQty;
                    $movementType = $diff >= 0 ? 'adjustment_in' : 'adjustment_out';
                    $movementQty = $diff;
                } else {
                    $addQty = abs($adjQty);
                    $newQty = $prevQty + $addQty;
                    $stock->quantity = $newQty;
                    $movementType = 'adjustment_in';
                    $movementQty = $addQty;
                }

                $stock->save();

                $adjustment->items()->create([
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'quantity_adjusted' => $adjQty,
                    'unit_cost' => $unitCost ?: (float) $product->cost_price,
                ]);

                StockMovement::create([
                    'branch_id' => $branchId,
                    'product_id' => $productId,
                    'product_variant_id' => $variantId,
                    'movement_type' => $movementType,
                    'quantity' => $movementQty,
                    'previous_quantity' => $prevQty,
                    'new_quantity' => $newQty,
                    'unit_cost' => $unitCost ?: (float) $product->cost_price,
                    'reference_type' => 'stock_adjustment',
                    'reference_id' => $adjustment->id,
                    'reason' => $data['reason'],
                    'remarks' => "Stock adjustment: {$adjNumber} ({$type})",
                    'user_id' => $user->id,
                ]);
            }

            return $adjustment->load(['items.product', 'branch', 'user']);
        });
    }

    /**
     * Create Inter-Branch Stock Transfer (as draft or dispatched)
     */
    public function createStockTransfer(array $data, User $user): StockTransfer
    {
        return DB::transaction(function () use ($data, $user) {
            $sourceBranchId = (int) $data['source_branch_id'];
            $destBranchId = (int) $data['destination_branch_id'];

            if ($sourceBranchId === $destBranchId) {
                throw ValidationException::withMessages([
                    'destination_branch_id' => ['Source and destination branches cannot be identical.']
                ]);
            }

            $status = $data['status'] ?? 'draft';
            $isDispatched = ($status === 'dispatched');

            $transferNum = 'TRF-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $transfer = StockTransfer::create([
                'transfer_number' => $transferNum,
                'source_branch_id' => $sourceBranchId,
                'destination_branch_id' => $destBranchId,
                'status' => $status,
                'dispatch_date' => $isDispatched ? now() : null,
                'dispatched_by' => $isDispatched ? $user->id : null,
                'notes' => $data['notes'] ?? null,
            ]);

            $allowNegative = (bool) BusinessFeature::where('feature_key', 'allow_negative_stock')->value('is_enabled');

            foreach ($data['items'] as $item) {
                $productId = (int) $item['product_id'];
                $variantId = !empty($item['variant_id'])
                    ? (int) $item['variant_id']
                    : (!empty($item['product_variant_id']) ? (int) $item['product_variant_id'] : null);
                $qty = (float) $item['quantity_sent'];

                $product = Product::with('unit')->findOrFail($productId);
                $this->validateUnitDecimals($product, $qty);

                if ($isDispatched) {
                    // Lock source branch stock with pessimistic row lock
                    $srcStock = $this->getLockedStock($sourceBranchId, $productId, $variantId);
                    $prevQty = (float) $srcStock->quantity;

                    if (!$allowNegative && $prevQty < $qty) {
                        throw ValidationException::withMessages([
                            'items' => ["Insufficient stock at source branch for [{$product->name}]. Available: {$prevQty}, Requested to transfer: {$qty}"]
                        ]);
                    }

                    $newQty = $prevQty - $qty;
                    $srcStock->quantity = $newQty;
                    $srcStock->save();
                }

                $transfer->items()->create([
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'quantity_sent' => $qty,
                    'quantity_received' => 0.000,
                    'notes' => $item['notes'] ?? null,
                ]);

                if ($isDispatched) {
                    StockMovement::create([
                        'branch_id' => $sourceBranchId,
                        'product_id' => $productId,
                        'product_variant_id' => $variantId,
                        'movement_type' => 'transfer_out',
                        'quantity' => -$qty,
                        'previous_quantity' => $prevQty,
                        'new_quantity' => $newQty,
                        'reference_type' => 'stock_transfer',
                        'reference_id' => $transfer->id,
                        'reason' => "Transfer dispatch to branch #{$destBranchId}",
                        'remarks' => "Transfer {$transferNum}",
                        'user_id' => $user->id,
                    ]);
                }
            }

            return $transfer->load(['items.product', 'sourceBranch', 'destinationBranch']);
        });
    }

    /**
     * Dispatch an existing draft Stock Transfer (deducts stock exactly once)
     */
    public function dispatchStockTransfer(StockTransfer $transfer, User $user): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $transfer = StockTransfer::where('id', $transfer->id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== 'draft') {
                throw new \DomainException("Cannot dispatch transfer with status [{$transfer->status}]. Only draft transfers can be dispatched.");
            }

            $sourceBranchId = $transfer->source_branch_id;
            $destBranchId = $transfer->destination_branch_id;
            $allowNegative = (bool) BusinessFeature::where('feature_key', 'allow_negative_stock')->value('is_enabled');

            foreach ($transfer->items as $item) {
                $productId = $item->product_id;
                $variantId = $item->variant_id;
                $qty = (float) $item->quantity_sent;

                $product = Product::with('unit')->findOrFail($productId);
                $this->validateUnitDecimals($product, $qty);

                $srcStock = $this->getLockedStock($sourceBranchId, $productId, $variantId);
                $prevQty = (float) $srcStock->quantity;

                if (!$allowNegative && $prevQty < $qty) {
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock at source branch for [{$product->name}]. Available: {$prevQty}, Requested to transfer: {$qty}"]
                    ]);
                }

                $newQty = $prevQty - $qty;
                $srcStock->quantity = $newQty;
                $srcStock->save();

                StockMovement::create([
                    'branch_id' => $sourceBranchId,
                    'product_id' => $productId,
                    'product_variant_id' => $variantId,
                    'movement_type' => 'transfer_out',
                    'quantity' => -$qty,
                    'previous_quantity' => $prevQty,
                    'new_quantity' => $newQty,
                    'reference_type' => 'stock_transfer',
                    'reference_id' => $transfer->id,
                    'reason' => "Transfer dispatch to branch #{$destBranchId}",
                    'remarks' => "Transfer {$transfer->transfer_number}",
                    'user_id' => $user->id,
                ]);
            }

            $transfer->update([
                'status' => 'dispatched',
                'dispatch_date' => now(),
                'dispatched_by' => $user->id,
            ]);

            return $transfer->fresh(['items.product', 'sourceBranch', 'destinationBranch']);
        });
    }

    /**
     * Receive an in-transit Stock Transfer with Discrepancy & Damage Tracking
     */
    public function receiveStockTransfer(StockTransfer $transfer, User $user, array $receiptData = []): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user, $receiptData) {
            // Lock transfer header to prevent concurrent receipt race conditions
            $transfer = StockTransfer::where('id', $transfer->id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== 'dispatched') {
                throw new \DomainException("Cannot receive transfer with status [{$transfer->status}]. Only dispatched transfers can be received.");
            }

            $destBranchId = $transfer->destination_branch_id;
            $itemsMap = collect($receiptData['items'] ?? [])->keyBy('product_id');

            foreach ($transfer->items as $item) {
                $itemInput = $itemsMap->get($item->product_id);
                $acceptedQty = isset($itemInput['accepted_quantity'])
                    ? (float) $itemInput['accepted_quantity']
                    : (isset($itemInput['quantity_received']) ? (float) $itemInput['quantity_received'] : (float) $item->quantity_sent);
                $damagedQty = isset($itemInput['damaged_quantity'])
                    ? (float) $itemInput['damaged_quantity']
                    : 0.000;

                $destStock = $this->getLockedStock($destBranchId, $item->product_id, $item->variant_id);
                $prevQty = (float) $destStock->quantity;
                $newQty = $prevQty + $acceptedQty;
                $destStock->quantity = $newQty;

                if ($damagedQty > 0) {
                    $destStock->damaged_quantity = (float) $destStock->damaged_quantity + $damagedQty;
                }

                $destStock->save();

                $item->quantity_received = $acceptedQty;
                $item->save();

                StockMovement::create([
                    'branch_id' => $destBranchId,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->variant_id,
                    'movement_type' => 'transfer_in',
                    'quantity' => $acceptedQty,
                    'previous_quantity' => $prevQty,
                    'new_quantity' => $newQty,
                    'reference_type' => 'stock_transfer',
                    'reference_id' => $transfer->id,
                    'reason' => "Transfer received from branch #{$transfer->source_branch_id}",
                    'remarks' => "Transfer {$transfer->transfer_number}" . ($damagedQty > 0 ? " (Damaged: {$damagedQty})" : ""),
                    'user_id' => $user->id,
                ]);
            }

            $transfer->update([
                'status' => 'received',
                'receive_date' => now(),
                'received_by' => $user->id,
            ]);

            return $transfer->fresh(['items.product', 'sourceBranch', 'destinationBranch']);
        });
    }

    /**
     * Get Low Stock Alerts
     */
    public function getLowStockAlerts(?int $branchId = null): array
    {
        $query = BranchStock::query()
            ->with(['product.unit', 'product.category', 'branch:id,name,branch_code', 'variant'])
            ->whereHas('product', function ($q) {
                $q->whereColumn('branch_stocks.quantity', '<=', 'products.minimum_stock');
            });

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query->get()->map(function ($stk) {
            return [
                'id' => $stk->id,
                'branch_id' => $stk->branch_id,
                'branch_name' => $stk->branch?->name,
                'product_id' => $stk->product_id,
                'product_name' => $stk->product?->name,
                'sku' => $stk->product?->sku,
                'unit' => $stk->product?->unit?->short_code,
                'current_quantity' => (float) $stk->quantity,
                'minimum_stock' => (float) ($stk->product?->minimum_stock ?? 0),
                'shortage' => max(0, (float) ($stk->product?->minimum_stock ?? 0) - (float) $stk->quantity),
            ];
        })->toArray();
    }

    /**
     * Audit trail of all stock movements
     */
    public function getMovementHistory(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = StockMovement::query()
            ->with(['product:id,name,sku,barcode', 'branch:id,name,branch_code', 'user:id,name', 'variant']);

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }

        if (!empty($filters['movement_type'])) {
            $query->where('movement_type', $filters['movement_type']);
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    /**
     * Stock valuation breakdown
     */
    public function getStockValuation(?int $branchId = null): array
    {
        $query = BranchStock::query()->with(['product.category', 'product.brand', 'branch']);
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $items = $query->get()->map(function ($stk) {
            $qty = (float) $stk->quantity;
            $cost = (float) ($stk->product?->cost_price ?? 0);
            $sell = (float) ($stk->product?->selling_price ?? 0);
            $totCost = $qty * $cost;
            $totRetail = $qty * $sell;

            return [
                'product_id' => $stk->product_id,
                'product_name' => $stk->product?->name,
                'sku' => $stk->product?->sku,
                'category' => $stk->product?->category?->name,
                'brand' => $stk->product?->brand?->name,
                'branch_name' => $stk->branch?->name,
                'quantity' => $qty,
                'unit_cost' => $cost,
                'unit_selling_price' => $sell,
                'total_cost_valuation' => round($totCost, 2),
                'total_retail_valuation' => round($totRetail, 2),
                'profit_margin_amount' => round($totRetail - $totCost, 2),
                'margin_percentage' => ($totCost > 0) ? round((($totRetail - $totCost) / $totCost) * 100, 2) : 0.0,
            ];
        });

        $totalCost = $items->sum('total_cost_valuation');
        $totalRetail = $items->sum('total_retail_valuation');

        return [
            'total_cost_valuation' => round($totalCost, 2),
            'total_retail_valuation' => round($totalRetail, 2),
            'total_projected_profit' => round($totalRetail - $totalCost, 2),
            'items' => $items,
        ];
    }
}

