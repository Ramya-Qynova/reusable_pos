<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Category;
use App\Models\Customer;
use App\Models\GoodsReceiptNote;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase8ReportsTest extends TestCase
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
            'name' => 'Beverages',
            'slug' => 'beverages',
            'is_active' => true,
        ]);
    }

    private function createProductWithStock(string $name, float $price, float $cost, float $stockQty, float $minStock = 5.0): Product
    {
        $product = Product::create([
            'name' => $name,
            'sku' => 'SKU-' . uniqid(),
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'cost_price' => $cost,
            'selling_price' => $price,
            'mrp' => $price,
            'minimum_stock' => $minStock,
            'tax_rate' => 18.00,
            'is_tax_inclusive' => false,
            'is_active' => true,
        ]);

        BranchStock::updateOrCreate(
            ['branch_id' => $this->branch->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => $stockQty, 'damaged_quantity' => 0.0]
        );

        return $product;
    }

    public function test_daily_sales_product_category_and_customer_reports(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-REP-01',
            'name' => 'Ananya Roy',
            'phone' => '9988776655',
            'is_active' => true,
        ]);

        $p1 = $this->createProductWithStock('Mango Shake 500ml', 80.0, 40.0, 50.0);
        $p2 = $this->createProductWithStock('Cold Coffee 300ml', 100.0, 50.0, 50.0);

        // Make sale
        $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'customer_id' => $customer->id,
                'payments' => [['payment_method' => 'cash', 'amount' => 500.0]],
                'items' => [
                    ['product_id' => $p1->id, 'quantity' => 2, 'unit_price' => 80.0],
                    ['product_id' => $p2->id, 'quantity' => 1, 'unit_price' => 100.0],
                ]
            ])->assertStatus(201);

        // 1. Daily Sales Report
        $daily = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/daily-sales')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $daily->json('data.summary.total_orders'));
        $this->assertNotEmpty($daily->json('data.daily_records'));

        // 2. Sales by Product Report
        $byProduct = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/sales-by-product')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $byProduct->json('data.total_quantity_sold'));
        $this->assertNotEmpty($byProduct->json('data.products'));

        // 3. Sales by Category Report
        $byCategory = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/sales-by-category')
            ->assertStatus(200);

        $this->assertNotEmpty($byCategory->json('data.categories'));

        // 4. Sales by Customer Report
        $byCustomer = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/sales-by-customer')
            ->assertStatus(200);

        $this->assertNotEmpty($byCustomer->json('data.customers'));
    }

    public function test_stock_low_stock_and_stock_movements_reports(): void
    {
        $pGood = $this->createProductWithStock('Green Tea Pack', 120.0, 70.0, 25.0, 5.0);
        $pLow = $this->createProductWithStock('Chamomile Tea', 150.0, 90.0, 2.0, 10.0); // 2 <= 10 -> Low stock!

        // 1. Stock Valuation Report
        $stockReport = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/stock')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $stockReport->json('data.summary.total_valuation_at_cost'));
        $this->assertNotEmpty($stockReport->json('data.stocks'));

        // 2. Low-Stock Report
        $lowStockReport = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/low-stock')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $lowStockReport->json('data.total_alerts'));
        $found = collect($lowStockReport->json('data.low_stock_items'))->firstWhere('product_id', $pLow->id);
        $this->assertNotNull($found);
        $this->assertEquals(8.0, (float) $found['shortage']);

        // 3. Stock Movement Report
        $movementsReport = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/stock-movements')
            ->assertStatus(200);

        $this->assertIsArray($movementsReport->json('data.movements'));
    }

    public function test_profit_gst_and_outstanding_reports(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-DUE-01',
            'name' => 'Meena Gupta',
            'phone' => '9123456780',
            'credit_limit' => 2000.0,
            'current_balance' => 650.0,
            'is_active' => true,
        ]);

        $supplier = Supplier::create([
            'supplier_code' => 'SUPP-DUE-01',
            'name' => 'Agro Fresh Farms',
            'phone' => '9444433333',
            'is_active' => true,
        ]);

        SupplierLedger::create([
            'supplier_id' => $supplier->id,
            'branch_id' => $this->branch->id,
            'transaction_type' => 'purchase_invoice',
            'transaction_date' => now()->toDateString(),
            'debit' => 0.0,
            'credit' => 1200.0,
            'running_balance' => 1200.0,
            'description' => 'Pending Invoice #INV-101',
        ]);

        $prod = $this->createProductWithStock('Orange Juice 1L', 120.0, 80.0, 30.0);

        // Make sale
        $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->postJson('/api/v1/sales', [
                'payments' => [['payment_method' => 'cash', 'amount' => 141.6]],
                'items' => [
                    ['product_id' => $prod->id, 'quantity' => 1, 'unit_price' => 120.0]
                ]
            ])->assertStatus(201);

        // 1. Profit Report
        $profit = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/profit')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $profit->json('data.gross_profit'));

        // 2. GST Report
        $gst = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/gst')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $gst->json('data.output_gst.total_output_gst'));

        // 3. Customer Outstanding Report
        $custOutstanding = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/customer-outstanding')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $custOutstanding->json('data.summary.total_credit_receivable'));

        // 4. Supplier Outstanding Report
        $suppOutstanding = $this->actingAs($this->adminUser)
            ->withHeaders(['X-Branch-ID' => $this->branch->id])
            ->getJson('/api/v1/reports/supplier-outstanding')
            ->assertStatus(200);

        $this->assertGreaterThan(0, $suppOutstanding->json('data.summary.total_payable_liability'));
    }
}
