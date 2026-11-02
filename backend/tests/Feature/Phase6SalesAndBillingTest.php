<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BranchProductPrice;
use App\Models\CashRegisterShift;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\SalesPayment;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class Phase6SalesAndBillingTest extends TestCase
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

        // Seed initial branch stock for test products so legitimate sales have available inventory
        if (Schema::hasTable('branch_stocks')) {
            foreach (Product::all() as $prod) {
                if ($prod->has_variants) {
                    foreach ($prod->variants as $variant) {
                        $this->seedStock($prod, 100.000, $variant->id);
                    }
                } else {
                    $this->seedStock($prod, 100.000);
                }
            }
        }
    }

    protected function seedStock(Product $product, float $qty = 100.0, ?int $variantId = null, ?int $branchId = null): void
    {
        if (Schema::hasTable('branch_stocks')) {
            DB::table('branch_stocks')->updateOrInsert(
                [
                    'branch_id' => $branchId ?? $this->mainBranch->id,
                    'product_id' => $product->id,
                    'variant_id' => $variantId,
                ],
                [
                    'quantity' => $qty,
                    'damaged_quantity' => 0.000,
                    'reserved_quantity' => 0.000,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Cash Drawer & Register Shift Tests
    |--------------------------------------------------------------------------
    */

    public function test_cashier_can_open_manage_and_close_cash_register_shift(): void
    {
        // 1. Open Shift
        $openResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/cash-register/open', [
                'opening_balance' => 500.00,
                'notes' => 'Morning shift opening',
            ]);

        $openResp->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'open',
                    'opening_balance' => '500.00',
                ],
            ]);

        $shiftId = $openResp->json('data.id');

        // 2. Prevent duplicate open shift for same cashier and branch
        $dupResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/cash-register/open', [
                'opening_balance' => 1000.00,
            ]);
        $dupResp->assertStatus(422);

        // 3. Record cash movement (cash in / pay-in)
        $cashInResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/cash-register/movement', [
                'type' => 'cash_in',
                'amount' => 200.00,
                'reason' => 'Float top up from manager',
            ]);
        $cashInResp->assertStatus(201);

        // 4. Record cash movement (cash out / pay-out)
        $cashOutResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/cash-register/movement', [
                'type' => 'cash_out',
                'amount' => 50.00,
                'reason' => 'Store milk expense',
            ]);
        $cashOutResp->assertStatus(201);

        // 5. Check current shift status: 500 + 200 - 50 = 650.00 expected
        $currentResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->getJson('/api/v1/cash-register/current');

        $currentResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $shiftId,
                    'status' => 'open',
                    'expected_balance' => 650.00,
                ],
            ]);

        // 6. Close Shift with discrepancy (actual 640.00 -> difference -10.00)
        $closeResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/cash-register/close', [
                'actual_closing_balance' => 640.00,
                'notes' => 'Shortage of 10 rupees due to coin change',
            ]);

        $closeResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'closed',
                    'expected_closing_balance' => '650.00',
                    'actual_closing_balance' => '640.00',
                    'difference' => '-10.00',
                ],
            ]);

        // 7. Verify Shift History
        $historyResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->getJson('/api/v1/cash-register/shifts');

        $historyResp->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'opened_at', 'closed_at', 'opening_balance', 'actual_closing_balance', 'difference'],
                ],
            ]);
    }

    /*
    |--------------------------------------------------------------------------
    | POS Billing & Transaction Safety Tests
    |--------------------------------------------------------------------------
    */

    public function test_cashier_can_create_basic_pos_sale_with_cash_payment(): void
    {
        // Open shift first
        $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/cash-register/open', ['opening_balance' => 500.00]);

        $product = Product::where('sku', 'OIL-SUN-001')->first() ?? Product::first();

        $saleData = [
            'is_gst_bill' => true,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
            'payments' => [
                [
                    'payment_method' => 'cash',
                    'amount' => 500.00,
                ],
            ],
        ];

        $response = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', $saleData);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Sale completed successfully.',
            ])
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'invoice_number',
                    'branch_id',
                    'user_id',
                    'grand_total',
                    'paid_amount',
                    'change_amount',
                    'payment_status',
                    'items',
                    'payments',
                ],
            ]);

        $invNumber = $response->json('data.invoice_number');
        $this->assertStringStartsWith("INV-MAIN-", $invNumber);

        // Verify Database insertion
        $this->assertDatabaseHas('sales_orders', [
            'invoice_number' => $invNumber,
            'branch_id' => $this->mainBranch->id,
            'user_id' => $this->cashier->id,
            'status' => 'completed',
            'payment_status' => 'paid',
        ]);

        // Verify Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'SALE_CREATED',
            'auditable_type' => SalesOrder::class,
            'user_id' => $this->cashier->id,
        ]);
    }

    public function test_tax_calculations_for_tax_inclusive_and_exclusive_items(): void
    {
        $unit = Unit::first();
        // Product 1: Tax exclusive 18% (Price: 100, Tax: 18 -> Total: 118)
        $prodExcl = Product::create([
            'category_id' => 1,
            'unit_id' => $unit->id,
            'tax_rate' => 18.00,
            'is_tax_inclusive' => false,
            'name' => 'Tax Exclusive Widget',
            'sku' => 'TAX-EXCL-100',
            'cost_price' => 50.00,
            'selling_price' => 100.00,
            'is_active' => true,
        ]);

        // Product 2: Tax inclusive 5% (Total Price: 105 -> Base: 100, Tax: 5)
        $prodIncl = Product::create([
            'category_id' => 1,
            'unit_id' => $unit->id,
            'tax_rate' => 5.00,
            'is_tax_inclusive' => true,
            'name' => 'Tax Inclusive Gadget',
            'sku' => 'TAX-INCL-105',
            'cost_price' => 50.00,
            'selling_price' => 105.00,
            'is_active' => true,
        ]);

        $this->seedStock($prodExcl, 50.0);
        $this->seedStock($prodIncl, 50.0);

        $saleData = [
            'is_gst_bill' => true,
            'items' => [
                ['product_id' => $prodExcl->id, 'quantity' => 1],
                ['product_id' => $prodIncl->id, 'quantity' => 1],
            ],
            'payments' => [
                ['payment_method' => 'card', 'amount' => 223.00, 'payment_reference' => 'TXN-998811'],
            ],
        ];

        $response = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', $saleData);

        $response->assertStatus(201);
        $data = $response->json('data');

        // Prod 1: Subtotal 100, Tax 18, Total 118
        // Prod 2: Subtotal 100, Tax 5, Total 105
        // Grand Total: 118 + 105 = 223.00
        $this->assertEquals(223.00, (float) $data['grand_total']);
        $this->assertEquals(23.00, (float) $data['tax_amount']);
        $this->assertEquals(200.00, (float) $data['subtotal']);

        // Non-GST toggle: All taxes 0
        $nonGstData = $saleData;
        $nonGstData['is_gst_bill'] = false;
        $nonGstData['payments'] = [['payment_method' => 'card', 'amount' => 205.00]];

        $nonGstResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', $nonGstData);

        $nonGstResp->assertStatus(201);
        $this->assertEquals(0.00, (float) $nonGstResp->json('data.tax_amount'));
    }

    public function test_discount_permission_enforcement(): void
    {
        $product = Product::first();

        // 1. Cashier (NO pos.discount permission) tries to apply discount -> Rejected 422
        $unauthResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'discount_type' => 'percentage',
                'discount_rate' => 10,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'cash', 'amount' => 500]],
            ]);

        $unauthResp->assertStatus(422)
            ->assertJsonValidationErrors(['discount']);

        // 2. Manager (HAS pos.discount permission) applies 10% bill discount -> Succeeds
        $authResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'discount_type' => 'percentage',
                'discount_rate' => 10,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'cash', 'amount' => 1000]],
            ]);

        $authResp->assertStatus(201);
        $this->assertGreaterThan(0, (float) $authResp->json('data.discount_amount'));
    }

    public function test_unit_decimal_quantity_enforcement(): void
    {
        $piecesUnit = Unit::where('allow_decimals', false)->first() ?? Unit::create(['name' => 'Box', 'short_code' => 'box', 'allow_decimals' => false]);
        $kgUnit = Unit::where('allow_decimals', true)->first() ?? Unit::create(['name' => 'Kilogram', 'short_code' => 'kg', 'allow_decimals' => true]);

        $pieceProduct = Product::create([
            'category_id' => 1,
            'unit_id' => $piecesUnit->id,
            'name' => 'Strict Piece Product',
            'sku' => 'STRICT-PCS-01',
            'cost_price' => 10.00,
            'selling_price' => 20.00,
            'is_active' => true,
        ]);

        $kgProduct = Product::create([
            'category_id' => 1,
            'unit_id' => $kgUnit->id,
            'name' => 'Loose Grain Product',
            'sku' => 'LOOSE-KG-01',
            'cost_price' => 40.00,
            'selling_price' => 60.00,
            'is_active' => true,
        ]);

        $this->seedStock($pieceProduct, 50.0);
        $this->seedStock($kgProduct, 50.0);

        // Decimals on whole-number unit -> 422
        $invalidResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'items' => [['product_id' => $pieceProduct->id, 'quantity' => 1.5]],
                'payments' => [['payment_method' => 'cash', 'amount' => 50.00]],
            ]);
        $invalidResp->assertStatus(422);

        // Decimals on weight unit -> 201 Success
        $validResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'items' => [['product_id' => $kgProduct->id, 'quantity' => 2.75]],
                'payments' => [['payment_method' => 'cash', 'amount' => 200.00]],
            ]);
        $validResp->assertStatus(201);
    }

    public function test_product_variants_pricing_and_attributes_selection(): void
    {
        $product = Product::where('has_variants', true)->first();
        if (!$product) {
            $product = Product::first();
        }

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'variant_sku' => 'VAR-TEST-L-RED',
            'variant_barcode' => '9900112233',
            'attributes_json' => ['Size' => 'L', 'Color' => 'Red'],
            'cost_price' => 150.00,
            'selling_price' => 250.00,
            'is_active' => true,
        ]);

        $this->seedStock($product, 50.0, $variant->id);

        $response = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'items' => [
                    [
                        'product_id' => $product->id,
                        'product_variant_id' => $variant->id,
                        'quantity' => 1,
                    ],
                ],
                'payments' => [
                    ['payment_method' => 'cash', 'amount' => 300.00],
                ],
            ]);

        $response->assertStatus(201);
        $item = $response->json('data.items.0');
        $this->assertEquals($variant->id, $item['product_variant_id']);
        $this->assertEquals(250.00, (float) $item['unit_price']);
    }

    public function test_multiple_payments_split_payment_and_change_calculation(): void
    {
        $product = Product::first();
        $unitPrice = (float) $product->selling_price;

        $response = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'items' => [['product_id' => $product->id, 'quantity' => 2]],
                'payments' => [
                    ['payment_method' => 'cash', 'amount' => 100.00],
                    ['payment_method' => 'upi', 'amount' => 500.00, 'payment_reference' => 'UPI-REF-12345'],
                ],
            ]);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertCount(2, $data['payments']);
        $this->assertEquals(600.00, (float) $data['paid_amount']);
        $this->assertGreaterThanOrEqual(0, (float) $data['change_amount']);
    }

    public function test_customer_selection_and_walk_in_customers(): void
    {
        $customer = Customer::first();
        $product = Product::first();

        // 1. With registered customer
        $custResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'cash', 'amount' => 500.00]],
            ]);

        $custResp->assertStatus(201)
            ->assertJson([
                'data' => ['customer_id' => $customer->id],
            ]);

        // 2. Walk-in customer (null customer_id)
        $walkinResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'customer_id' => null,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'cash', 'amount' => 500.00]],
            ]);

        $walkinResp->assertStatus(201)
            ->assertJson([
                'data' => ['customer_id' => null],
            ]);
    }

    public function test_sales_history_listing_and_filtering(): void
    {
        $customer = Customer::first();
        $product = Product::first();

        // Create 2 sales
        $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'cash', 'amount' => 500.00]],
            ]);

        $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'customer_id' => null,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'upi', 'amount' => 500.00]],
            ]);

        // Filter by customer
        $custFilterResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->getJson("/api/v1/sales?customer_id={$customer->id}");

        $custFilterResp->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($custFilterResp->json('data')));

        // Sales summary
        $summaryResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->getJson('/api/v1/sales/summary');

        $summaryResp->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_sales_count',
                    'total_revenue',
                    'payment_breakdown' => ['cash', 'upi', 'card'],
                ],
            ]);
    }

    public function test_stock_service_integration_and_transaction_safety(): void
    {
        $tableCreated = false;
        if (!Schema::hasTable('branch_stocks')) {
            Schema::create('branch_stocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id');
                $table->foreignId('product_id');
                $table->foreignId('variant_id')->nullable();
                $table->decimal('quantity', 12, 3)->default(0);
                $table->timestamps();
            });
            $tableCreated = true;
        }

        $product = Product::where('has_variants', false)->first();

        // Branch has 5 units available in stock
        DB::table('branch_stocks')->updateOrInsert(
            ['branch_id' => $this->mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => 5.000, 'updated_at' => now()]
        );

        // 1. Trying to buy 10 units (when only 5 in stock) -> Fails 422 Insufficient Stock
        $failResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'items' => [['product_id' => $product->id, 'quantity' => 10]],
                'payments' => [['payment_method' => 'cash', 'amount' => 5000]],
            ]);

        $failResp->assertStatus(422)
            ->assertJsonValidationErrors(['items']);

        // Stock remains unchanged at 5
        $qty = DB::table('branch_stocks')->where('branch_id', $this->mainBranch->id)->where('product_id', $product->id)->whereNull('variant_id')->value('quantity');
        $this->assertEquals(5.000, (float) $qty);

        // 2. Buy 2 units -> Succeeds, stock decremented to 3
        $succResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'items' => [['product_id' => $product->id, 'quantity' => 2]],
                'payments' => [['payment_method' => 'cash', 'amount' => 1000]],
            ]);

        $succResp->assertStatus(201);
        $newQty = DB::table('branch_stocks')->where('branch_id', $this->mainBranch->id)->where('product_id', $product->id)->whereNull('variant_id')->value('quantity');
        $this->assertEquals(3.000, (float) $newQty);

        // Clean up simulated table only if created in this test
        if ($tableCreated) {
            Schema::dropIfExists('branch_stocks');
        }
    }

    public function test_branch_authorization_guards_pos_billing(): void
    {
        $product = Product::first();

        // Manager is authorized only for MAIN branch, NOT airport branch
        $airportBranch = Branch::where('branch_code', 'AIRPORT')->first();

        $unauthResp = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $airportBranch->id)
            ->postJson('/api/v1/sales', [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'cash', 'amount' => 500]],
            ]);

        $unauthResp->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'BRANCH_ACCESS_DENIED',
            ]);
    }

    public function test_branch_specific_pricing_and_promotional_override(): void
    {
        $product = Product::first();
        BranchProductPrice::updateOrCreate(
            [
                'branch_id' => $this->mainBranch->id,
                'product_id' => $product->id,
                'variant_id' => null,
            ],
            [
                'selling_price' => 45.00,
                'special_price' => 42.00,
                'is_active' => true,
            ]
        );

        $this->seedStock($product, 50.0);

        $response = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'is_gst_bill' => false,
                'items' => [['product_id' => $product->id, 'quantity' => 2]],
                'payments' => [['payment_method' => 'cash', 'amount' => 84.00]],
            ]);

        $response->assertStatus(201);
        $item = $response->json('data.items.0');
        $this->assertEquals(42.00, (float) $item['unit_price']);
        $this->assertEquals(84.00, (float) $response->json('data.grand_total'));
    }

    public function test_customer_group_discount_auto_applied_without_manual_discount_permission(): void
    {
        $group = CustomerGroup::create([
            'name' => 'Gold Members',
            'code' => 'GOLD',
            'discount_percentage' => 10.00,
            'is_active' => true,
        ]);

        $vipCustomer = Customer::create([
            'customer_code' => 'CUST-GOLD-001',
            'customer_group_id' => $group->id,
            'name' => 'Alice Gold',
            'phone' => '9888877777',
            'is_active' => true,
        ]);

        $product = Product::create([
            'category_id' => 1,
            'unit_id' => Unit::first()->id,
            'name' => 'Member Test Item',
            'sku' => 'MEM-TEST-001',
            'cost_price' => 50.00,
            'selling_price' => 100.00,
            'tax_rate' => 0.00,
            'is_tax_inclusive' => true,
            'is_active' => true,
        ]);

        $this->seedStock($product, 20.0);

        // Cashier has NO pos.discount permission, but selects Gold customer
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'customer_id' => $vipCustomer->id,
                'is_gst_bill' => false,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method' => 'cash', 'amount' => 90.00]],
            ]);

        $response->assertStatus(201);
        // 100 - 10% = 90.00
        $this->assertEquals(10.00, (float) $response->json('data.discount_amount'));
        $this->assertEquals(90.00, (float) $response->json('data.grand_total'));
    }

    public function test_idempotent_checkout_prevents_duplicate_sales_and_stock_deductions(): void
    {
        $product = Product::where('has_variants', false)->first();
        $this->seedStock($product, 50.0);

        $payload = [
            'idempotency_key' => 'IDEMP-TEST-998877',
            'is_gst_bill' => false,
            'items' => [['product_id' => $product->id, 'quantity' => 5]],
            'payments' => [['payment_method' => 'cash', 'amount' => 1000]],
        ];

        // First call
        $firstResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', $payload);

        $firstResp->assertStatus(201);
        $orderId = $firstResp->json('data.id');

        // Stock should be 45
        $stockAfterFirst = DB::table('branch_stocks')
            ->where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->whereNull('variant_id')
            ->value('quantity');
        $this->assertEquals(45.0, (float) $stockAfterFirst);

        // Second duplicate call with same idempotency key
        $secondResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', $payload);

        $secondResp->assertSuccessful();
        $this->assertEquals($orderId, $secondResp->json('data.id'));

        // Stock MUST remain 45, NOT decremented twice!
        $stockAfterSecond = DB::table('branch_stocks')
            ->where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->whereNull('variant_id')
            ->value('quantity');
        $this->assertEquals(45.0, (float) $stockAfterSecond);
    }

    public function test_sales_cancellation_and_inventory_reversal(): void
    {
        // 1. Open shift
        $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/cash-register/open', ['opening_balance' => 500.00]);

        $product = Product::where('has_variants', false)->first();
        $this->seedStock($product, 50.0);

        // 2. Complete a sale of 4 units
        $saleResp = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson('/api/v1/sales', [
                'is_gst_bill' => false,
                'items' => [['product_id' => $product->id, 'quantity' => 4]],
                'payments' => [['payment_method' => 'cash', 'amount' => 1000.00]],
            ]);

        $saleResp->assertStatus(201);
        $saleId = $saleResp->json('data.id');

        // Stock decremented to 46
        $stockAfterSale = DB::table('branch_stocks')
            ->where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->whereNull('variant_id')
            ->value('quantity');
        $this->assertEquals(46.0, (float) $stockAfterSale);

        // 3. Cashier (NO pos.returns permission) attempts to cancel -> 403 Forbidden
        $unauthCancel = $this->actingAs($this->cashier, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson("/api/v1/sales/{$saleId}/cancel", [
                'reason' => 'Customer changed mind',
            ]);
        $unauthCancel->assertStatus(403);

        // 4. Branch Manager (HAS pos.returns permission) cancels sale -> 200 Success
        $authCancel = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson("/api/v1/sales/{$saleId}/cancel", [
                'reason' => 'Customer returned defective goods',
            ]);

        $authCancel->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $saleId,
                    'status' => 'cancelled',
                ],
            ]);

        // 5. Stock restored back to 50
        $stockAfterCancel = DB::table('branch_stocks')
            ->where('branch_id', $this->mainBranch->id)
            ->where('product_id', $product->id)
            ->whereNull('variant_id')
            ->value('quantity');
        $this->assertEquals(50.0, (float) $stockAfterCancel);

        // 6. Stock movement logged with type = return and positive quantity
        if (Schema::hasTable('stock_movements')) {
            $this->assertDatabaseHas('stock_movements', [
                'branch_id' => $this->mainBranch->id,
                'product_id' => $product->id,
                'movement_type' => 'return',
                'reference_id' => $saleId,
            ]);
        }

        // 7. Payments marked refunded
        $this->assertDatabaseHas('sales_payments', [
            'sales_order_id' => $saleId,
            'status' => 'refunded',
        ]);

        // 8. Audit log created
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'SALE_CANCELLED',
            'auditable_type' => SalesOrder::class,
            'auditable_id' => $saleId,
        ]);

        // 9. Cannot cancel an already cancelled sale -> 422
        $dupCancel = $this->actingAs($this->manager, 'sanctum')
            ->withHeader('X-Branch-ID', $this->mainBranch->id)
            ->postJson("/api/v1/sales/{$saleId}/cancel", [
                'reason' => 'Attempting duplicate cancellation',
            ]);
        $dupCancel->assertStatus(422);
    }
}
