<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Category;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReturn;
use App\Models\Role;
use App\Models\SalesOrder;
use App\Models\SalesPayment;
use App\Models\SalesReturn;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\Unit;
use App\Models\User;
use App\Models\UserBranchRole;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase7ReturnsAndLedgersTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Branch $branch;
    protected Unit $unit;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->adminUser = User::where('email', 'admin@greenmart.pos')->first()
            ?? User::factory()->create(['is_super_admin' => true]);

        $this->branch = Branch::first() ?? Branch::create([
            'branch_code' => 'MAIN',
            'name' => 'Main Supermarket Branch',
            'is_active' => true,
        ]);

        $this->unit = Unit::first() ?? Unit::create([
            'name' => 'Pieces',
            'short_code' => 'pcs',
            'allow_decimals' => false,
        ]);

        $this->category = Category::first() ?? Category::create([
            'name' => 'Groceries',
            'slug' => 'groceries',
            'is_active' => true,
        ]);
    }

    private function createProduct(string $name, float $price = 100.0, float $cost = 60.0): Product
    {
        return Product::create([
            'name' => $name,
            'sku' => 'SKU-' . uniqid(),
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'cost_price' => $cost,
            'selling_price' => $price,
            'mrp' => $price,
            'tax_rate' => 0.00,
            'is_tax_inclusive' => false,
            'is_active' => true,
        ]);
    }

    private function setStock(Product $product, float $quantity): void
    {
        BranchStock::updateOrCreate(
            ['branch_id' => $this->branch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => $quantity, 'damaged_quantity' => 0]
        );
    }

    public function test_can_process_partial_and_full_sales_returns_with_stock_reversal(): void
    {
        $product = $this->createProduct('Organic Apple Juice', 100.0, 50.0);
        $this->setStock($product, 10.0);

        // 1. Make a sale of 5 items
        $saleResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'payments' => [
                    ['payment_method' => 'cash', 'amount' => 500.0]
                ],
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100.0]
                ]
            ]);

        $saleResponse->assertStatus(201);
        $saleId = $saleResponse->json('data.id');
        $saleItemId = $saleResponse->json('data.items.0.id');

        // Verify stock deducted to 5
        $stock = BranchStock::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
        $this->assertEquals(5.0, (float) $stock->quantity);

        // 2. Partial return of 2 items
        $returnResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales/returns', [
                'sales_order_id' => $saleId,
                'refund_method' => 'cash',
                'reason' => 'Customer changed mind',
                'items' => [
                    [
                        'sales_order_item_id' => $saleItemId,
                        'product_id' => $product->id,
                        'quantity' => 2,
                        'restock' => true,
                        'condition' => 'good',
                    ]
                ]
            ]);

        $returnResponse->assertStatus(201);
        $this->assertEquals(200.0, (float) $returnResponse->json('data.total_amount'));

        // Verify stock restored by 2 (now 7)
        $stock->refresh();
        $this->assertEquals(7.0, (float) $stock->quantity);

        // Verify stock movement was recorded
        $movement = StockMovement::where('reference_type', 'sales_return')
            ->where('movement_type', 'return')
            ->latest('id')
            ->first();
        $this->assertNotNull($movement);
        $this->assertEquals(2.0, (float) $movement->quantity);

        // 3. Try to return 4 items (exceeds remaining 3) -> should fail 422
        $excessResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales/returns', [
                'sales_order_id' => $saleId,
                'refund_method' => 'cash',
                'items' => [
                    [
                        'sales_order_item_id' => $saleItemId,
                        'product_id' => $product->id,
                        'quantity' => 4,
                        'restock' => true,
                    ]
                ]
            ]);
        $excessResponse->assertStatus(422);

        // 4. Return remaining 3 items (full return complete)
        $finalReturn = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales/returns', [
                'sales_order_id' => $saleId,
                'refund_method' => 'cash',
                'items' => [
                    [
                        'sales_order_item_id' => $saleItemId,
                        'product_id' => $product->id,
                        'quantity' => 3,
                        'restock' => true,
                        'condition' => 'good',
                    ]
                ]
            ]);
        $finalReturn->assertStatus(201);

        // Stock is now fully restored to 10
        $stock->refresh();
        $this->assertEquals(10.0, (float) $stock->quantity);
    }

    public function test_damaged_sales_return_increments_damaged_stock_separately(): void
    {
        $product = $this->createProduct('Glass Vase', 250.0);
        $this->setStock($product, 5.0);

        $saleResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'payments' => [['payment_method' => 'cash', 'amount' => 250.0]],
                'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 250.0]]
            ]);

        $saleId = $saleResponse->json('data.id');
        $saleItemId = $saleResponse->json('data.items.0.id');

        $returnResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales/returns', [
                'sales_order_id' => $saleId,
                'refund_method' => 'cash',
                'reason' => 'Broken handle',
                'items' => [
                    [
                        'sales_order_item_id' => $saleItemId,
                        'product_id' => $product->id,
                        'quantity' => 1,
                        'restock' => true,
                        'condition' => 'damaged',
                    ]
                ]
            ]);

        $returnResponse->assertStatus(201);

        $stock = BranchStock::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
        $this->assertEquals(4.0, (float) $stock->quantity); // salable stock stays at 4
        $this->assertEquals(1.0, (float) $stock->damaged_quantity); // damaged stock increased to 1
    }

    public function test_sales_return_can_issue_credit_note_and_redeem_it(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-TEST-01',
            'name' => 'Rahul Sharma',
            'phone' => '9876543210',
            'credit_limit' => 5000.0,
            'current_balance' => 0.0,
            'is_active' => true,
        ]);

        $product = $this->createProduct('T-Shirt', 500.0);
        $this->setStock($product, 10.0);

        $saleResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'payments' => [['payment_method' => 'cash', 'amount' => 500.0]],
                'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500.0]]
            ]);

        $saleId = $saleResponse->json('data.id');
        $saleItemId = $saleResponse->json('data.items.0.id');

        // Return with credit_note refund method
        $returnResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales/returns', [
                'sales_order_id' => $saleId,
                'customer_id' => $customer->id,
                'refund_method' => 'credit_note',
                'items' => [
                    ['sales_order_item_id' => $saleItemId, 'product_id' => $product->id, 'quantity' => 1]
                ]
            ]);

        $returnResponse->assertStatus(201);

        // Verify credit note created
        $creditNote = CreditNote::where('customer_id', $customer->id)->first();
        $this->assertNotNull($creditNote);
        $this->assertEquals(500.0, (float) $creditNote->amount);
        $this->assertEquals(500.0, (float) $creditNote->balance_amount);
        $this->assertEquals('active', $creditNote->status);

        // Redeem 200 of the credit note
        $redeemResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson("/api/v1/credit-notes/{$creditNote->id}/redeem", [
                'amount' => 200.0,
            ]);

        $redeemResponse->assertStatus(200);
        $creditNote->refresh();
        $this->assertEquals(300.0, (float) $creditNote->balance_amount);
        $this->assertEquals(200.0, (float) $creditNote->used_amount);
        $this->assertEquals('partially_used', $creditNote->status);
    }

    public function test_customer_credit_limit_validation_and_ledger_tracking(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-CREDIT-01',
            'name' => 'Sunil Verma',
            'phone' => '9888877777',
            'credit_limit' => 1000.0, // max 1000 credit
            'current_balance' => 800.0, // already owes 800
            'is_active' => true,
        ]);

        $product = $this->createProduct('Luxury Perfume', 500.0);
        $this->setStock($product, 10.0);

        // Sale for 500 with only 100 paid -> unpaid is 400.
        // Balance would become 800 + 400 = 1200 > credit limit 1000 -> must fail with 422!
        $rejectedSale = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'payments' => [['payment_method' => 'cash', 'amount' => 100.0]],
                'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500.0]]
            ]);

        $rejectedSale->assertStatus(422);
        $rejectedSale->assertJsonValidationErrors(['customer_id']);

        // Sale for 500 with 350 paid -> unpaid is 150.
        // Balance becomes 800 + 150 = 950 <= 1000 -> succeeds!
        $validSale = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'payments' => [['payment_method' => 'cash', 'amount' => 350.0]],
                'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500.0]]
            ]);

        $validSale->assertStatus(201);
        $customer->refresh();
        $this->assertEquals(950.0, (float) $customer->current_balance);

        // Verify Customer Ledger has the sale entry
        $ledger = CustomerLedger::where('customer_id', $customer->id)
            ->where('transaction_type', 'sale')
            ->latest('id')
            ->first();
        $this->assertNotNull($ledger);
        $this->assertEquals(150.0, (float) $ledger->debit);
        $this->assertEquals(950.0, (float) $ledger->running_balance);
    }

    public function test_customer_payment_allocation_to_unpaid_invoices_and_ledger(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-ALLOC-01',
            'name' => 'Vikram Patel',
            'phone' => '9777766666',
            'credit_limit' => 5000.0,
            'current_balance' => 0.0,
            'is_active' => true,
        ]);

        $product = $this->createProduct('Rice Bag', 300.0);
        $this->setStock($product, 20.0);

        // Create Order 1: 300 total, 100 paid (200 unpaid)
        $order1 = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'payments' => [['payment_method' => 'cash', 'amount' => 100.0]],
                'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 300.0]]
            ])->json('data.id');

        // Create Order 2: 300 total, 0 paid (300 unpaid)
        $order2 = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'payments' => [['payment_method' => 'other', 'amount' => 0.01]], // minimal tender
                'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 300.0]]
            ])->json('data.id');

        $customer->refresh();
        $this->assertGreaterThan(400, (float) $customer->current_balance);

        // Record customer credit collection payment of 250
        // Should fully pay Order 1 (200) and partially pay Order 2 (50)
        $payResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson("/api/v1/customers/{$customer->id}/credit-payment", [
                'amount' => 250.0,
                'payment_method' => 'upi',
            ]);

        $payResponse->assertStatus(200);

        // Check Order 1 is now marked paid
        $o1 = SalesOrder::find($order1);
        $this->assertEquals('paid', $o1->payment_status);
        $this->assertEquals(300.0, (float) $o1->paid_amount);

        // Check Customer Ledger statement API
        $ledgerResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson("/api/v1/customers/{$customer->id}/ledger");

        $ledgerResponse->assertStatus(200);
        $this->assertNotEmpty($ledgerResponse->json('data.entries'));
        $this->assertGreaterThan(0, $ledgerResponse->json('data.total_credit'));
    }

    public function test_purchase_return_deducts_stock_and_records_supplier_ledger(): void
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUPP-RET-01',
            'name' => 'Metro Foods Supply',
            'phone' => '9111122222',
            'is_active' => true,
        ]);

        $product = $this->createProduct('Sunflower Oil 1L', 150.0, 110.0);
        $this->setStock($product, 20.0);

        $returnResponse = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/purchases/returns', [
                'supplier_id' => $supplier->id,
                'branch_id' => $this->branch->id,
                'reason' => 'Leakage in packing',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 5,
                        'unit_cost' => 110.0,
                        'tax_rate' => 0.0,
                    ]
                ]
            ]);

        $returnResponse->assertStatus(201);
        $this->assertEquals(550.0, (float) $returnResponse->json('data.total_amount'));

        // Stock decreased from 20 to 15
        $stock = BranchStock::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
        $this->assertEquals(15.0, (float) $stock->quantity);

        // Stock movement recorded
        $movement = StockMovement::where('reference_type', 'purchase_return')->latest('id')->first();
        $this->assertNotNull($movement);
        $this->assertEquals(-5.0, (float) $movement->quantity);

        // Supplier ledger updated with debit (reduces payable)
        $ledger = SupplierLedger::where('supplier_id', $supplier->id)->latest('id')->first();
        $this->assertNotNull($ledger);
        $this->assertEquals(550.0, (float) $ledger->debit);
    }
}
