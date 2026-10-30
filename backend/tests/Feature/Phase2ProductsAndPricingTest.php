<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BranchProductPrice;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\TaxSlab;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase2ProductsAndPricingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;
    protected Branch $mainBranch;
    protected Branch $airportBranch;
    protected Branch $metroBranch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->admin = User::where('email', 'admin@greenmart.pos')->first();
        $this->cashier = User::where('email', 'cashier@greenmart.pos')->first();
        $this->mainBranch = Branch::where('branch_code', 'MAIN')->first();
        $this->airportBranch = Branch::where('branch_code', 'AIRPORT')->first();
        $this->metroBranch = Branch::where('branch_code', 'METRO')->first();
    }

    public function test_can_list_categories_as_flat_list_and_tree(): void
    {
        // Flat list
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/categories');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data' => [['id', 'name', 'slug']]]);

        // Tree hierarchy
        $treeResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/categories?tree=true');

        $treeResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $produce = collect($treeResponse->json('data'))->firstWhere('slug', 'fresh-produce');
        $this->assertNotNull($produce);
        $this->assertNotEmpty($produce['children']);
    }

    public function test_can_create_update_and_delete_category(): void
    {
        // Create
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/categories', [
                'name' => 'Organic Herbs',
                'description' => 'Fresh culinary herbs',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Organic Herbs',
                    'slug' => 'organic-herbs',
                ],
            ]);

        $catId = $response->json('data.id');

        // Update
        $updateResp = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/categories/{$catId}", [
                'name' => 'Organic Fresh Herbs',
            ]);

        $updateResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Organic Fresh Herbs',
                ],
            ]);

        // Delete
        $delResp = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/categories/{$catId}");

        $delResp->assertStatus(200);
        $this->assertDatabaseMissing('categories', ['id' => $catId]);
    }

    public function test_cannot_delete_category_with_active_products(): void
    {
        $dairyCat = Category::where('slug', 'dairy-eggs')->first();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/categories/{$dairyCat->id}");

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error_code' => 'CATEGORY_HAS_PRODUCTS',
            ]);
    }

    /**
     * Point 3: Category Hierarchy - Prevent self-parenting and circular relationships
     */
    public function test_category_prevents_self_parenting_and_circular_hierarchy(): void
    {
        $produceCat = Category::where('slug', 'fresh-produce')->first();
        $vegCat = Category::where('slug', 'vegetables')->first(); // child of fresh-produce

        // 1. Direct self-parenting
        $selfResp = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/categories/{$produceCat->id}", [
                'parent_id' => $produceCat->id,
            ]);

        $selfResp->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_FAILED',
            ]);

        // 2. Circular relationship (setting produceCat's parent to its own child vegCat)
        $circularResp = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/categories/{$produceCat->id}", [
                'parent_id' => $vegCat->id,
            ]);

        $circularResp->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_FAILED',
            ]);
    }

    /**
     * Point 7: Units API - update, delete, and assigned-product deletion restriction
     */
    public function test_units_crud_and_assigned_product_deletion_restriction(): void
    {
        $kgUnit = Unit::where('short_code', 'kg')->first();
        $pcsUnit = Unit::where('short_code', 'pcs')->first();

        $this->assertTrue((bool) $kgUnit->allow_decimals);
        $this->assertFalse((bool) $pcsUnit->allow_decimals);

        // 1. Create unit
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/units', [
                'name' => 'Metric Ton',
                'short_code' => 'ton',
                'allow_decimals' => true,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'short_code' => 'ton',
                    'allow_decimals' => true,
                ],
            ]);

        $tonId = $response->json('data.id');

        // 2. Update unit
        $updateResp = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/units/{$tonId}", [
                'name' => 'Metric Tonne',
            ]);

        $updateResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Metric Tonne',
                ],
            ]);

        // 3. Delete unassigned unit -> succeeds
        $delResp = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/units/{$tonId}");

        $delResp->assertStatus(200);
        $this->assertDatabaseMissing('units', ['id' => $tonId]);

        // 4. Delete unit assigned to existing products -> fails with 409
        $assignedDelResp = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/units/{$kgUnit->id}");

        $assignedDelResp->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error_code' => 'UNIT_ASSIGNED_TO_PRODUCTS',
            ]);
    }

    public function test_can_list_products_with_pagination_and_search(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=Milk');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonFragment(['name' => 'Whole Milk 1L']);
    }

    public function test_product_creation_validates_and_rejects_duplicate_sku_and_barcode(): void
    {
        $cat = Category::first();
        $unit = Unit::first();

        // 1. Create product
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $unit->id,
                'name' => 'Organic Honey 500g',
                'sku' => 'HONEY-500G',
                'barcode' => '7890123456789',
                'cost_price' => 150.00,
                'selling_price' => 220.00,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'sku' => 'HONEY-500G',
                    'selling_price' => 220.00,
                ],
            ]);

        // Check AuditLog was recorded
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'PRODUCT_CREATED',
            'user_id' => $this->admin->id,
        ]);

        // 2. Reject duplicate SKU
        $dupSkuResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $unit->id,
                'name' => 'Another Honey Bottle',
                'sku' => 'HONEY-500G',
                'cost_price' => 150.00,
                'selling_price' => 220.00,
            ]);

        $dupSkuResp->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_FAILED',
            ]);

        // 3. Reject duplicate Barcode
        $dupBarcodeResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $unit->id,
                'name' => 'Different Honey Bottle',
                'sku' => 'HONEY-DIFF-SKU',
                'barcode' => '7890123456789',
                'cost_price' => 150.00,
                'selling_price' => 220.00,
            ]);

        $dupBarcodeResp->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_FAILED',
            ]);
    }

    /**
     * Point 1: Variant Uniqueness - Prevent duplicate attribute combinations for the same product
     */
    public function test_variant_uniqueness_prevents_duplicate_attribute_combinations(): void
    {
        $cat = Category::first();
        $unit = Unit::first();

        // Attempt creating product with 2 variants having the same attribute combination
        // (even though SKUs and key ordering/casing differ)
        $dupComboResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $unit->id,
                'name' => 'Polo Shirt',
                'sku' => 'POLO-001',
                'cost_price' => 300.00,
                'selling_price' => 599.00,
                'variants' => [
                    [
                        'variant_sku' => 'POLO-RED-L-1',
                        'variant_barcode' => '771101',
                        'attributes_json' => ['Color' => 'Red', 'Size' => 'Large'],
                        'selling_price' => 599.00,
                    ],
                    [
                        'variant_sku' => 'POLO-RED-L-2', // Different SKU!
                        'variant_barcode' => '771102',
                        'attributes_json' => ['size' => 'large', 'color' => 'red'], // Same attributes!
                        'selling_price' => 599.00,
                    ],
                ],
            ]);

        $dupComboResp->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_FAILED',
            ]);
    }

    /**
     * Point 4: Tax Consistency - Ensure tax_slab_id and tax_rate cannot contradict each other
     */
    public function test_tax_consistency_prevents_contradictory_tax_rates(): void
    {
        $cat = Category::first();
        $unit = Unit::first();
        $gst5 = TaxSlab::where('rate', 5.00)->first();

        // 1. Contradictory tax rate provided (GST 5% slab with 18% tax rate) -> Rejected
        $contradictResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $unit->id,
                'tax_slab_id' => $gst5->id,
                'tax_rate' => 18.00, // Contradicts slab rate of 5.00!
                'name' => 'Tax Contradiction Item',
                'sku' => 'TAX-CONTRADICT-01',
                'cost_price' => 50.00,
                'selling_price' => 100.00,
            ]);

        $contradictResp->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_FAILED',
            ]);

        // 2. Tax slab provided without explicit rate -> automatically synchronized to 5.00%
        $syncResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $unit->id,
                'tax_slab_id' => $gst5->id,
                'name' => 'Auto Synced Tax Item',
                'sku' => 'TAX-SYNC-01',
                'cost_price' => 50.00,
                'selling_price' => 100.00,
            ]);

        $syncResp->assertStatus(201);
        $this->assertEquals(5.00, (float) $syncResp->json('data.tax_rate'));
    }

    /**
     * Point 5: Decimal Precision - Verify DECIMAL types for prices, costs, and fractional quantities
     */
    public function test_decimal_precision_for_prices_costs_and_quantities(): void
    {
        $cat = Category::first();
        $kgUnit = Unit::where('short_code', 'kg')->first();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $kgUnit->id,
                'name' => 'Alphonso Mangoes',
                'sku' => 'FRUIT-MANGO-KG',
                'cost_price' => 125.75,
                'selling_price' => 189.95,
                'minimum_stock' => 12.350, // 3 decimal places for kg
            ]);

        $response->assertStatus(201);

        $product = Product::where('sku', 'FRUIT-MANGO-KG')->first();
        $this->assertEquals('125.75', (string) $product->cost_price);
        $this->assertEquals('189.95', (string) $product->selling_price);
        $this->assertEquals('12.350', (string) $product->minimum_stock);
    }

    /**
     * Point 2 & 6: Branch Pricing Authorization, Product-Variant Validation, and Permissions
     */
    public function test_branch_pricing_authorization_and_variant_validation(): void
    {
        $milk = Product::where('sku', 'MILK-1L')->first();
        $tshirt = Product::where('sku', 'APP-CREW-TSHIRT')->first();
        $tshirtVariant = $tshirt->variants()->first();

        // 1. Cashier without catalog.manage cannot configure branch pricing
        $cashierResp = $this->actingAs($this->cashier, 'sanctum')
            ->postJson("/api/v1/products/{$milk->id}/branch-price", [
                'branch_id' => $this->mainBranch->id,
                'selling_price' => 64.00,
            ]);

        $cashierResp->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'PERMISSION_DENIED',
            ]);

        // 2. Setting branch price with variant that does NOT belong to product -> Rejected
        $invalidVariantResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$milk->id}/branch-price", [
                'branch_id' => $this->mainBranch->id,
                'variant_id' => $tshirtVariant->id, // Belongs to T-shirt, not Milk!
                'selling_price' => 64.00,
            ]);

        $invalidVariantResp->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INVALID_VARIANT_FOR_PRODUCT',
            ]);

        // 3. User unauthorized for the target branch
        // Manager of mainBranch attempting to set price on airportBranch (no access)
        $manager = User::where('email', 'manager@greenmart.pos')->first();
        $unauthBranchResp = $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/products/{$milk->id}/branch-price", [
                'branch_id' => $this->airportBranch->id,
                'selling_price' => 79.00,
            ]);

        $unauthBranchResp->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'BRANCH_ACCESS_DENIED',
            ]);

        // 4. Valid branch pricing configuration by Admin
        $validResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$milk->id}/branch-price", [
                'branch_id' => $this->mainBranch->id,
                'selling_price' => 64.50,
            ]);

        $validResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'selling_price' => 64.50,
                ],
            ]);
    }

    /**
     * Point 6: Role-Based Access for Product, Category, and Unit Mutations
     */
    public function test_permissions_guard_catalog_mutations_from_unprivileged_users(): void
    {
        $cat = Category::first();
        $unit = Unit::first();

        // Cashier cannot create product
        $cashierProductResp = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/v1/products', [
                'category_id' => $cat->id,
                'unit_id' => $unit->id,
                'name' => 'Cashier Item',
                'sku' => 'CASHIER-01',
                'cost_price' => 10.00,
                'selling_price' => 20.00,
            ]);

        $cashierProductResp->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'PERMISSION_DENIED',
            ]);

        // Cashier cannot delete category
        $cashierCatResp = $this->actingAs($this->cashier, 'sanctum')
            ->deleteJson("/api/v1/categories/{$cat->id}");

        $cashierCatResp->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'PERMISSION_DENIED',
            ]);

        // Cashier CAN view products and categories (read access for counter sales)
        $cashierReadResp = $this->actingAs($this->cashier, 'sanctum')
            ->getJson('/api/v1/products');

        $cashierReadResp->assertStatus(200);
    }

    public function test_fast_barcode_lookup_for_pos_counter(): void
    {
        // 1. Direct master product barcode lookup
        $response = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Branch-ID', (string) $this->airportBranch->id)
            ->getJson('/api/v1/products/barcode/8901234567890'); // Whole Milk 1L

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'type' => 'product',
                    'selling_price' => 75.00, // Airport branch override
                    'is_branch_override' => true,
                    'product' => [
                        'name' => 'Whole Milk 1L',
                        'sku' => 'MILK-1L',
                    ],
                ],
            ]);

        // 2. Variant barcode lookup (T-shirt Black Size M)
        $variantResp = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products/barcode/8901234567801');

        $variantResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'type' => 'variant',
                    'selling_price' => 499.00,
                    'variant' => [
                        'variant_sku' => 'APP-TSHIRT-BLK-M',
                    ],
                ],
            ]);

        // 3. Non-existent barcode
        $notFoundResp = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products/barcode/0000000000000');

        $notFoundResp->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error_code' => 'PRODUCT_NOT_FOUND',
            ]);
    }

    /**
     * Point 8: Product Soft Deletion preserves integrity of references
     */
    public function test_product_soft_delete_preserves_historical_references(): void
    {
        $tomato = Product::where('sku', 'VEG-TOMATO')->first();

        // Create a branch price reference before deletion
        BranchProductPrice::create([
            'branch_id' => $this->mainBranch->id,
            'product_id' => $tomato->id,
            'selling_price' => 42.00,
            'is_active' => true,
        ]);

        $delResp = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/products/{$tomato->id}");

        $delResp->assertStatus(200);

        // Excluded from standard active query
        $this->assertNull(Product::find($tomato->id));

        // Row remains intact in database with deleted_at timestamp
        $trashed = Product::withTrashed()->find($tomato->id);
        $this->assertNotNull($trashed);
        $this->assertNotNull($trashed->deleted_at);

        // Related branch prices remain structurally intact without constraint failures
        $this->assertDatabaseHas('branch_product_prices', [
            'product_id' => $tomato->id,
            'branch_id' => $this->mainBranch->id,
            'selling_price' => 42.00,
        ]);
    }
}
