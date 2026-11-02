<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\GoodsReceiptNote;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\StockAdjustment;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Phase5InventoryAndStockTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;
    protected User $cashier;
    protected Branch $mainBranch;
    protected Branch $northBranch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->admin = User::where('email', 'admin@greenmart.pos')->first();
        $this->manager = User::where('email', 'manager@greenmart.pos')->first();
        $this->cashier = User::where('email', 'cashier@greenmart.pos')->first();

        $this->mainBranch = Branch::where('branch_code', 'MAIN')->first();
        $this->northBranch = Branch::where('branch_code', 'NORTH')->first();
    }

    /**
     * 1. Controlled opening stock initializes inventory and prevents duplicate setup
     */
    public function test_can_record_controlled_opening_stock_and_prevents_duplicate_initialization(): void
    {
        $product = Product::where('has_variants', false)->first();

        $payload = [
            'branch_id' => $this->mainBranch->id,
            'remarks' => 'Store launch opening stock setup',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => null,
                    'quantity' => 50.000,
                    'unit_cost' => 25.00,
                ],
            ],
        ];

        // Manager has inventory.adjust permission
        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/opening-stock', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Opening stock recorded successfully.',
            ]);

        // Verify BranchStock balance
        $stock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertNotNull($stock);
        $this->assertEquals(50.000, (float) $stock->quantity);

        // Verify StockMovement audit entry
        $this->assertDatabaseHas('stock_movements', [
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'movement_type' => 'initial',
            'quantity' => 50.000,
            'reference_type' => 'opening_stock',
            'user_id' => $this->manager->id,
        ]);

        // Attempting duplicate opening stock setup for same branch and product must be rejected with 422
        $dupResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/opening-stock', $payload);

        $dupResp->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }

    /**
     * 2. Direct stock in increments balance and records immutable movement
     */
    public function test_direct_stock_in_increments_balance_and_records_audit_movement(): void
    {
        $product = Product::where('has_variants', false)->first();

        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/stock-in', [
                'branch_id' => $this->mainBranch->id,
                'product_id' => $product->id,
                'quantity' => 20.000,
                'unit_cost' => 30.00,
                'reason' => 'Direct vendor delivery',
                'remarks' => 'Challan #CH-9921',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Stock in recorded successfully.',
            ]);

        $stock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertEquals(20.000, (float) $stock->quantity);

        $this->assertDatabaseHas('stock_movements', [
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'movement_type' => 'stock_in',
            'quantity' => 20.000,
            'user_id' => $this->manager->id,
        ]);
    }

    /**
     * 3. Stock operations strictly enforce unit decimal quantity rules
     */
    public function test_stock_in_enforces_unit_decimal_quantity_rules(): void
    {
        $pieceUnit = Unit::where('allow_decimals', false)->first();
        if (!$pieceUnit) {
            $pieceUnit = Unit::create(['name' => 'Piece', 'short_code' => 'pcs', 'allow_decimals' => false]);
        }

        $strictProduct = Product::create([
            'category_id' => 1,
            'unit_id' => $pieceUnit->id,
            'name' => 'Indivisible Item',
            'sku' => 'INDIVISIBLE-001',
            'cost_price' => 10.00,
            'selling_price' => 20.00,
            'is_active' => true,
        ]);

        // Attempting to stock in fractional quantity on whole-number unit -> 422
        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/stock-in', [
                'branch_id' => $this->mainBranch->id,
                'product_id' => $strictProduct->id,
                'quantity' => 2.500, // Fractional quantity forbidden
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
    }

    /**
     * 4. Direct stock out decrements balance and rejects insufficient stock
     */
    public function test_direct_stock_out_decrements_balance_and_rejects_insufficient_stock(): void
    {
        $product = Product::where('has_variants', false)->first();

        // Give branch 10 units
        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 10.000]
        );

        // 1. Trying to stock out 15 units -> Fails 422 (Insufficient stock)
        $failResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/stock-out', [
                'branch_id' => $this->mainBranch->id,
                'product_id' => $product->id,
                'quantity' => 15.000,
                'reason' => 'Sample issue',
            ]);

        $failResp->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        // 2. Stock out 4 units -> Succeeds, balance becomes 6
        $succResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/stock-out', [
                'branch_id' => $this->mainBranch->id,
                'product_id' => $product->id,
                'quantity' => 4.000,
                'reason' => 'Store use',
            ]);

        $succResp->assertStatus(200);

        $stock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertEquals(6.000, (float) $stock->quantity);

        $this->assertDatabaseHas('stock_movements', [
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'movement_type' => 'stock_out',
            'quantity' => -4.000,
        ]);
    }

    /**
     * 5. Stock adjustments: addition, subtraction, damage, and count corrections
     */
    public function test_stock_adjustment_addition_subtraction_damage_and_physical_count(): void
    {
        $product = Product::where('has_variants', false)->first();

        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 20.000, 'damaged_quantity' => 0.000]
        );

        // 1. Damage adjustment: 3 units damaged -> saleable qty becomes 17, damaged qty becomes 3
        $damageResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/adjust', [
                'branch_id' => $this->mainBranch->id,
                'reason' => 'Water leakage damage in aisle 2',
                'type' => 'damage',
                'items' => [
                    ['product_id' => $product->id, 'quantity_adjusted' => 3.000],
                ],
            ]);

        $damageResp->assertStatus(201);

        $stock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertEquals(17.000, (float) $stock->quantity);
        $this->assertEquals(3.000, (float) $stock->damaged_quantity);

        $this->assertDatabaseHas('stock_movements', [
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'movement_type' => 'damage',
            'quantity' => -3.000,
        ]);

        // 2. Physical count correction: counted 25 units -> stock becomes 25
        $countResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/adjust', [
                'branch_id' => $this->mainBranch->id,
                'reason' => 'Monthly physical audit count',
                'type' => 'physical_count',
                'items' => [
                    ['product_id' => $product->id, 'quantity_adjusted' => 25.000],
                ],
            ]);

        $countResp->assertStatus(201);

        $stock = $stock->fresh();
        $this->assertEquals(25.000, (float) $stock->quantity);
    }

    /**
     * 6. Inter-branch stock transfer: dispatch validates source stock and deducts inventory
     */
    public function test_stock_transfer_dispatch_validates_source_stock_and_deducts_inventory(): void
    {
        $product = Product::where('has_variants', false)->first();

        // Source branch has 10 units
        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 10.000]
        );

        // 1. Cannot transfer to the identical branch
        $sameResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/transfers', [
                'source_branch_id' => $this->mainBranch->id,
                'destination_branch_id' => $this->mainBranch->id,
                'items' => [['product_id' => $product->id, 'quantity_sent' => 5]],
            ]);
        $sameResp->assertStatus(422);

        // 2. Cannot transfer more than source stock has available
        $overResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/transfers', [
                'source_branch_id' => $this->mainBranch->id,
                'destination_branch_id' => $this->northBranch->id,
                'items' => [['product_id' => $product->id, 'quantity_sent' => 15]],
            ]);
        $overResp->assertStatus(422);

        // 3. Dispatch 6 units -> Source branch becomes 4, transfer status is dispatched
        $succResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/transfers', [
                'source_branch_id' => $this->mainBranch->id,
                'destination_branch_id' => $this->northBranch->id,
                'notes' => 'Replenishment for North branch',
                'items' => [['product_id' => $product->id, 'quantity_sent' => 6.000]],
            ]);

        $succResp->assertStatus(201);
        $transferId = $succResp->json('data.id');

        $srcStock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertEquals(4.000, (float) $srcStock->quantity);

        $this->assertDatabaseHas('stock_transfers', [
            'id' => $transferId,
            'status' => 'dispatched',
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'movement_type' => 'transfer_out',
            'quantity' => -6.000,
        ]);
    }

    /**
     * 7. Stock transfer receipt increases destination stock and handles in-transit discrepancies
     */
    public function test_stock_transfer_receipt_increases_destination_stock_and_tracks_discrepancies(): void
    {
        $product = Product::where('has_variants', false)->first();

        // Create dispatched transfer: 10 units sent from Main to North
        $transfer = StockTransfer::create([
            'transfer_number' => 'TRF-TEST-0001',
            'source_branch_id' => $this->mainBranch->id,
            'destination_branch_id' => $this->northBranch->id,
            'status' => 'dispatched',
            'dispatch_date' => now(),
            'dispatched_by' => $this->manager->id,
        ]);

        $transfer->items()->create([
            'product_id' => $product->id,
            'quantity_sent' => 10.000,
            'quantity_received' => 0.000,
        ]);

        // North branch previously had 2 units
        BranchStock::updateOrCreate(
            ['branch_id' => $this->northBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 2.000, 'damaged_quantity' => 0.000]
        );

        // Assign manager to North branch as well so they have access to destination branch
        $managerRole = \App\Models\Role::where('slug', 'branch_manager')->first();
        \App\Models\UserBranchRole::updateOrCreate(
            ['user_id' => $this->manager->id, 'branch_id' => $this->northBranch->id, 'role_id' => $managerRole->id]
        );

        // Receive transfer at North branch: 9 units good, 1 unit damaged in transit
        $receiveResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->northBranch->id)
            ->postJson("/api/v1/inventory/transfers/{$transfer->id}/receive", [
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity_received' => 9.000,
                        'damaged_quantity' => 1.000,
                    ],
                ],
            ]);

        $receiveResp->assertStatus(200);

        // Destination stock should now be: 2 + 9 = 11 units saleable, 1 unit damaged
        $destStock = BranchStock::where('branch_id', $this->northBranch->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertEquals(11.000, (float) $destStock->quantity);
        $this->assertEquals(1.000, (float) $destStock->damaged_quantity);

        $this->assertEquals('received', $transfer->fresh()->status);

        // Trying to receive again must fail
        $secondResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->northBranch->id)
            ->postJson("/api/v1/inventory/transfers/{$transfer->id}/receive");

        $secondResp->assertStatus(500); // DomainException: already received
    }

    /**
     * 7b. Stock transfer draft creation does not modify stock, dispatch deducts once, and prevents duplicate operations
     */
    public function test_stock_transfer_draft_creation_does_not_modify_stock_and_dispatch_deducts_once(): void
    {
        $product = Product::where('has_variants', false)->first();

        // Assign manager to North branch as well so they have access to destination branch
        $managerRole = \App\Models\Role::where('slug', 'branch_manager')->first();
        \App\Models\UserBranchRole::updateOrCreate(
            ['user_id' => $this->manager->id, 'branch_id' => $this->northBranch->id, 'role_id' => $managerRole->id]
        );

        // Source branch has 20 units
        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 20.000]
        );

        // 1. Create transfer with draft status -> Stock must NOT change
        $draftResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/transfers', [
                'source_branch_id' => $this->mainBranch->id,
                'destination_branch_id' => $this->northBranch->id,
                'status' => 'draft',
                'notes' => 'Draft transfer test',
                'items' => [['product_id' => $product->id, 'quantity_sent' => 7.000]],
            ]);

        $draftResp->assertStatus(201);
        $transferId = $draftResp->json('data.id');

        $this->assertDatabaseHas('stock_transfers', [
            'id' => $transferId,
            'status' => 'draft',
            'dispatch_date' => null,
            'dispatched_by' => null,
        ]);

        // Source stock must remain unchanged at 20.000
        $srcStock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();
        $this->assertEquals(20.000, (float) $srcStock->quantity);

        // Cannot receive a draft transfer
        $receiveDraftResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->northBranch->id)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/receive");
        $receiveDraftResp->assertStatus(500); // DomainException: only dispatched transfers can be received

        // 2. Dispatch the draft transfer -> Stock is deducted exactly once
        $dispatchResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/dispatch");

        $dispatchResp->assertStatus(200);

        $this->assertDatabaseHas('stock_transfers', [
            'id' => $transferId,
            'status' => 'dispatched',
        ]);

        $srcStock->refresh();
        $this->assertEquals(13.000, (float) $srcStock->quantity); // 20 - 7 = 13

        // 3. Trying to dispatch again must fail (prevent repeated dispatch)
        $reDispatchResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/dispatch");
        $reDispatchResp->assertStatus(500); // DomainException: only draft transfers can be dispatched

        // Source stock remains 13.000 (not deducted again)
        $srcStock->refresh();
        $this->assertEquals(13.000, (float) $srcStock->quantity);
    }

    /**
     * 7c. Branch stock uniqueness guarantees duplicate base-product stock records cannot exist
     */
    public function test_branch_stock_uniqueness_prevents_duplicate_base_product_records(): void
    {
        $product = Product::where('has_variants', false)->first();

        // Initial record created
        $stock1 = BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 15.000]
        );
        $this->assertNotNull($stock1->id);

        // Attempting to create duplicate base-product stock record directly fails with exception
        $this->expectException(\DomainException::class);
        $stockDuplicate = new BranchStock([
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'variant_id' => null,
            'quantity' => 5.000,
        ]);
        $stockDuplicate->save();
    }

    /**
     * 8. Branch isolation and permissions guard inventory operations
     */
    public function test_branch_isolation_and_permission_enforcement_guards_inventory_mutations(): void
    {
        $product = Product::where('has_variants', false)->first();

        // Cashier user has NO inventory.adjust or inventory.transfer permissions
        $unauthAdjust = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/stock-in', [
                'product_id' => $product->id,
                'quantity' => 10,
            ]);

        $unauthAdjust->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'PERMISSION_DENIED',
            ]);

        $unauthTransfer = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/inventory/transfers', [
                'source_branch_id' => $this->mainBranch->id,
                'destination_branch_id' => $this->northBranch->id,
                'items' => [['product_id' => $product->id, 'quantity_sent' => 5]],
            ]);

        $unauthTransfer->assertStatus(403);
    }

    /**
     * 9. Low stock alerts accurately identify products below minimum stock
     */
    public function test_low_stock_alerts_identifies_shortage_against_minimum_stock(): void
    {
        $product = Product::where('has_variants', false)->first();
        $product->minimum_stock = 15.000;
        $product->save();

        // Branch has only 4 units
        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 4.000]
        );

        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->getJson('/api/v1/inventory/low-stock-alerts');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertTrue(collect($data)->contains('product_id', $product->id));
        $alertItem = collect($data)->firstWhere('product_id', $product->id);
        $this->assertEquals(4.000, (float) $alertItem['current_quantity']);
        $this->assertEquals(15.000, (float) $alertItem['minimum_stock']);
        $this->assertEquals(11.000, (float) $alertItem['shortage']);
    }

    /**
     * 10. Stock valuation calculates cost, retail, and projected margins accurately
     */
    public function test_stock_valuation_reports_accurate_cost_and_retail_metrics(): void
    {
        $product = Product::where('has_variants', false)->first();
        $product->cost_price = 40.00;
        $product->selling_price = 60.00;
        $product->save();

        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 10.000]
        );

        $response = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->getJson('/api/v1/inventory/valuation');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertGreaterThanOrEqual(400.00, (float) $data['total_cost_valuation']);
        $this->assertGreaterThanOrEqual(600.00, (float) $data['total_retail_valuation']);
    }

    /**
     * 11. GRN verification increases inventory only for accepted quantities
     */
    public function test_grn_accepted_quantity_increments_stock_and_separated_from_damaged(): void
    {
        $supplier = Supplier::first();
        $product = Product::where('has_variants', false)->first();

        // Initial stock is 0
        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 0.000, 'damaged_quantity' => 0.000]
        );

        // Record GRN: 20 received (15 accepted, 3 damaged, 2 rejected)
        $response = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/purchases/goods-receipts', [
                'branch_id' => $this->mainBranch->id,
                'supplier_id' => $supplier->id,
                'supplier_invoice_number' => 'SINV-8812',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'received_quantity' => 20.000,
                        'accepted_quantity' => 15.000,
                        'damaged_quantity' => 3.000,
                        'rejected_quantity' => 2.000,
                        'unit_cost' => 50.00,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $stock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();

        // Only accepted quantity (15) must enter available saleable stock!
        $this->assertEquals(15.000, (float) $stock->quantity);
        $this->assertEquals(3.000, (float) $stock->damaged_quantity);

        $this->assertDatabaseHas('stock_movements', [
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'movement_type' => 'purchase_receipt',
            'quantity' => 15.000,
        ]);
    }

    /**
     * 12. Safe GRN cancellation reverses accepted stock and voids liabilities
     */
    public function test_grn_cancellation_safely_reverses_accepted_stock_and_reverts_po_and_invoice(): void
    {
        $supplier = Supplier::first();
        $product = Product::where('has_variants', false)->first();

        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 0.000, 'damaged_quantity' => 0.000]
        );

        $grnResp = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/purchases/goods-receipts', [
                'branch_id' => $this->mainBranch->id,
                'supplier_id' => $supplier->id,
                'supplier_invoice_number' => 'SINV-REVERSE',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'received_quantity' => 10.000,
                        'accepted_quantity' => 10.000,
                        'unit_cost' => 45.00,
                    ],
                ],
            ]);

        $grnId = $grnResp->json('data.id');
        $this->assertEquals(10.000, (float) BranchStock::where('branch_id', $this->mainBranch->id)->where('product_id', $product->id)->value('quantity'));

        // Cancel the GRN
        $cancelResp = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson("/api/v1/purchases/goods-receipts/{$grnId}/cancel", [
                'reason' => 'Vendor sent wrong shipment batch',
            ]);

        $cancelResp->assertStatus(200);

        // Stock must be safely reversed back to 0
        $stock = BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->first();
        $this->assertEquals(0.000, (float) $stock->quantity);

        // Immutable reversal movement recorded
        $this->assertDatabaseHas('stock_movements', [
            'branch_id' => $this->mainBranch->id,
            'product_id' => $product->id,
            'movement_type' => 'adjustment_out',
            'quantity' => -10.000,
            'reference_type' => 'goods_receipt_cancellation',
        ]);

        $this->assertEquals('cancelled', GoodsReceiptNote::find($grnId)->status);
    }

    /**
     * 13. GRN cancellation fails safely when accepted stock was already consumed
     */
    public function test_grn_cancellation_fails_safely_when_stock_was_already_consumed(): void
    {
        $supplier = Supplier::first();
        $product = Product::where('has_variants', false)->first();

        BranchStock::updateOrCreate(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 0.000]
        );

        $grnResp = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/purchases/goods-receipts', [
                'branch_id' => $this->mainBranch->id,
                'supplier_id' => $supplier->id,
                'items' => [
                    [
                        'product_id' => $product->id,
                        'received_quantity' => 10.000,
                        'accepted_quantity' => 10.000,
                        'unit_cost' => 45.00,
                    ],
                ],
            ]);

        $grnId = $grnResp->json('data.id');

        // Simulate that 7 units were sold / consumed, leaving only 3 in stock
        BranchStock::where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->update(['quantity' => 3.000]);

        // Attempting to cancel GRN of 10 units must fail with 422 to prevent negative stock!
        $cancelResp = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson("/api/v1/purchases/goods-receipts/{$grnId}/cancel", [
                'reason' => 'Defective goods recall',
            ]);

        $cancelResp->assertStatus(422)
            ->assertJsonValidationErrors(['grn']);

        // Stock remains untouched at 3
        $this->assertEquals(3.000, (float) BranchStock::where('branch_id', $this->mainBranch->id)->where('product_id', $product->id)->value('quantity'));
    }
}
