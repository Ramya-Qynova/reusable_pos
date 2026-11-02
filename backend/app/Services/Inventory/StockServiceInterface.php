<?php

namespace App\Services\Inventory;

use App\Models\SalesOrder;

interface StockServiceInterface
{
    /**
     * Validate that each item has sufficient stock in the specified branch.
     * Throws an exception or returns false if insufficient and negative stock is disallowed.
     *
     * @param int $branchId
     * @param array $items Array of ['product_id', 'product_variant_id', 'quantity']
     * @return void
     */
    public function validateStockAvailability(int $branchId, array $items): void;

    /**
     * Deduct stock for all items in the finalized sale order.
     * Must be called within the sales database transaction.
     *
     * @param SalesOrder $sale
     * @return void
     */
    public function deductStockForSale(SalesOrder $sale): void;

    /**
     * Reverse stock deductions when a sale is cancelled or returned.
     * Must be called within database transaction.
     *
     * @param SalesOrder $sale
     * @param string|null $reason
     * @return void
     */
    public function reverseStockForSale(SalesOrder $sale, ?string $reason = null): void;

    /**
     * Get available stock quantity for a product / variant in a branch.
     *
     * @param int $branchId
     * @param int $productId
     * @param int|null $variantId
     * @return float|null Returns null if stock tracking is uninitialized
     */
    public function getAvailableStock(int $branchId, int $productId, ?int $variantId = null): ?float;
}
