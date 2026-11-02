<?php

namespace App\Services\Inventory;

use App\Models\AuditLog;
use App\Models\BusinessFeature;
use App\Models\Product;
use App\Models\SalesOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class StockServiceBridge implements StockServiceInterface
{
    /**
     * Validate stock availability for sale items before finalizing.
     */
    public function validateStockAvailability(int $branchId, array $items): void
    {
        // Check if negative stock is permitted by business vertical feature flags
        $allowNegativeStock = (bool) BusinessFeature::where('feature_key', 'allow_negative_stock')
            ->value('is_enabled');

        if ($allowNegativeStock) {
            return;
        }

        // If Phase 5 stock table exists (e.g. branch_stocks or stock_ledgers)
        if (Schema::hasTable('branch_stocks')) {
            foreach ($items as $item) {
                $qty = (float) ($item['quantity'] ?? 0);
                $productId = $item['product_id'];
                $variantId = $item['product_variant_id'] ?? $item['variant_id'] ?? null;

                $query = DB::table('branch_stocks')
                    ->where('branch_id', $branchId)
                    ->where('product_id', $productId);

                if ($variantId) {
                    $query->where('variant_id', $variantId);
                } else {
                    $query->whereNull('variant_id');
                }

                $available = (float) ($query->value('quantity') ?? 0);

                if ($available < $qty) {
                    $prodName = Product::find($productId)?->name ?? "Product #{$productId}";
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for [{$prodName}] at this branch. Available: {$available}, Requested: {$qty}."]
                    ]);
                }
            }
        }
    }

    /**
     * Deduct stock for all items in the finalized sale order.
     * Guaranteed to execute inside DB transaction of the sale.
     * Pessimistic row locking ensures concurrency safety and prevents negative stock.
     */
    public function deductStockForSale(SalesOrder $sale): void
    {
        $allowNegativeStock = (bool) BusinessFeature::where('feature_key', 'allow_negative_stock')
            ->value('is_enabled');

        // 1. If Phase 5 inventory tables exist, deduct directly in the transaction
        if (Schema::hasTable('branch_stocks')) {
            foreach ($sale->items as $item) {
                $query = DB::table('branch_stocks')
                    ->where('branch_id', $sale->branch_id)
                    ->where('product_id', $item->product_id);

                if ($item->product_variant_id) {
                    $query->where('variant_id', $item->product_variant_id);
                } else {
                    $query->whereNull('variant_id');
                }

                // Pessimistic row lock to prevent concurrency overselling
                $stockRow = $query->lockForUpdate()->first();
                $currentQty = $stockRow ? (float) $stockRow->quantity : 0.0;
                $requestedQty = (float) $item->quantity;

                if (!$allowNegativeStock && $currentQty < $requestedQty) {
                    $prodName = $item->product_name ?? "Product #{$item->product_id}";
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for [{$prodName}] during transaction lock. Available: {$currentQty}, requested: {$requestedQty}."]
                    ]);
                }

                if ($stockRow) {
                    DB::table('branch_stocks')
                        ->where('id', $stockRow->id)
                        ->decrement('quantity', $requestedQty);
                } else {
                    DB::table('branch_stocks')->insert([
                        'branch_id' => $sale->branch_id,
                        'product_id' => $item->product_id,
                        'variant_id' => $item->product_variant_id,
                        'quantity' => -$requestedQty,
                        'damaged_quantity' => 0.000,
                        'reserved_quantity' => 0.000,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // If stock_movements table exists, record auditable movement
                if (Schema::hasTable('stock_movements')) {
                    DB::table('stock_movements')->insert([
                        'branch_id' => $sale->branch_id,
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'movement_type' => 'sale',
                        'quantity' => -$requestedQty,
                        'reference_type' => 'sales_order',
                        'reference_id' => $sale->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // 2. Maintain transactional audit entry linking sale and stock deduction event
        AuditLog::create([
            'user_id' => $sale->user_id,
            'branch_id' => $sale->branch_id,
            'action' => 'SALE_STOCK_DEDUCTED',
            'auditable_type' => SalesOrder::class,
            'auditable_id' => $sale->id,
            'new_values' => [
                'invoice_number' => $sale->invoice_number,
                'items_count' => $sale->items->count(),
                'total_quantity' => $sale->items->sum('quantity'),
            ],
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'created_at' => now(),
        ]);

        Log::info("Stock deduction finalized for Sale #{$sale->invoice_number} (Branch ID: {$sale->branch_id})");
    }

    /**
     * Reverse stock deductions when a sale is cancelled or returned.
     * Executes inside DB transaction with pessimistic locking.
     */
    public function reverseStockForSale(SalesOrder $sale, ?string $reason = null): void
    {
        if (Schema::hasTable('branch_stocks')) {
            foreach ($sale->items as $item) {
                $query = DB::table('branch_stocks')
                    ->where('branch_id', $sale->branch_id)
                    ->where('product_id', $item->product_id);

                if ($item->product_variant_id) {
                    $query->where('variant_id', $item->product_variant_id);
                } else {
                    $query->whereNull('variant_id');
                }

                $stockRow = $query->lockForUpdate()->first();
                $qtyToRestore = (float) $item->quantity;

                if ($stockRow) {
                    DB::table('branch_stocks')
                        ->where('id', $stockRow->id)
                        ->increment('quantity', $qtyToRestore);
                } else {
                    DB::table('branch_stocks')->insert([
                        'branch_id' => $sale->branch_id,
                        'product_id' => $item->product_id,
                        'variant_id' => $item->product_variant_id,
                        'quantity' => $qtyToRestore,
                        'damaged_quantity' => 0.000,
                        'reserved_quantity' => 0.000,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                if (Schema::hasTable('stock_movements')) {
                    DB::table('stock_movements')->insert([
                        'branch_id' => $sale->branch_id,
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'movement_type' => 'return',
                        'quantity' => $qtyToRestore,
                        'reference_type' => 'sales_order',
                        'reference_id' => $sale->id,
                        'reason' => $reason ? substr($reason, 0, 190) : "Sale #{$sale->invoice_number} cancelled",
                        'user_id' => auth()->id() ?? $sale->user_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        AuditLog::create([
            'user_id' => auth()->id() ?? $sale->user_id,
            'branch_id' => $sale->branch_id,
            'action' => 'SALE_STOCK_REVERSED',
            'auditable_type' => SalesOrder::class,
            'auditable_id' => $sale->id,
            'new_values' => [
                'invoice_number' => $sale->invoice_number,
                'items_count' => $sale->items->count(),
                'total_quantity_restored' => $sale->items->sum('quantity'),
                'reason' => $reason,
            ],
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'created_at' => now(),
        ]);

        Log::info("Stock restored for cancelled Sale #{$sale->invoice_number} (Branch ID: {$sale->branch_id})");
    }

    /**
     * Get available stock quantity for a product / variant in a branch.
     */
    public function getAvailableStock(int $branchId, int $productId, ?int $variantId = null): ?float
    {
        if (Schema::hasTable('branch_stocks')) {
            $query = DB::table('branch_stocks')
                ->where('branch_id', $branchId)
                ->where('product_id', $productId);

            if ($variantId) {
                $query->where('variant_id', $variantId);
            } else {
                $query->whereNull('variant_id');
            }

            return (float) ($query->value('quantity') ?? 0);
        }

        return null;
    }
}
