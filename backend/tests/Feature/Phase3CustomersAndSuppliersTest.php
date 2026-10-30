<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class Phase3CustomersAndSuppliersTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->admin = User::where('email', 'admin@greenmart.pos')->first();
        $this->cashier = User::where('email', 'cashier@greenmart.pos')->first();
    }

    /*
    |--------------------------------------------------------------------------
    | Customers Master Tests
    |--------------------------------------------------------------------------
    */

    public function test_can_list_customers_with_pagination_and_meta(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/customers?per_page=2');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Customers retrieved successfully.',
            ])
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'customer_code',
                        'name',
                        'phone',
                        'email',
                        'city',
                        'is_active',
                    ],
                ],
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_can_filter_customers_by_status(): void
    {
        // Filter active
        $responseActive = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/customers?is_active=1');

        $responseActive->assertStatus(200);
        foreach ($responseActive->json('data') as $item) {
            $this->assertTrue($item['is_active']);
        }

        // Filter inactive
        $responseInactive = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/customers?is_active=0');

        $responseInactive->assertStatus(200);
        foreach ($responseInactive->json('data') as $item) {
            $this->assertFalse($item['is_active']);
        }
    }

    public function test_can_search_customers_by_name_phone_code_and_email(): void
    {
        // By Name
        $respName = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/customers?search=Doe');
        $respName->assertStatus(200);
        $this->assertTrue(collect($respName->json('data'))->contains('name', 'John Doe'));

        // By Code
        $respCode = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/customers?search=CUST-00004');
        $respCode->assertStatus(200);
        $this->assertTrue(collect($respCode->json('data'))->contains('customer_code', 'CUST-00004'));

        // By Phone
        $respPhone = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/customers?search=98222');
        $respPhone->assertStatus(200);
        $this->assertTrue(collect($respPhone->json('data'))->contains('name', 'Sarah Jenkins'));

        // By Email
        $respEmail = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/customers?search=techcorp.com');
        $respEmail->assertStatus(200);
        $this->assertTrue(collect($respEmail->json('data'))->contains('customer_code', 'CUST-00004'));
    }

    public function test_can_create_customer_with_valid_details_and_auto_code(): void
    {
        $payload = [
            'name' => 'Meera Krishnan',
            'phone' => '+91 98450 12345',
            'alternate_phone' => '+91 98450 54321',
            'email' => 'meera.k@example.com',
            'address' => '77, Palm Beach Road',
            'city' => 'Marina Bay',
            'state' => 'Tamil Nadu',
            'postal_code' => '600028',
            'tax_number' => 'GSTIN33XYZAB1234C1Z9',
            'notes' => 'Preferred wholesale buyer',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/customers', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Meera Krishnan',
                    'phone' => '+91 98450 12345',
                    'email' => 'meera.k@example.com',
                    'city' => 'Marina Bay',
                    'is_active' => true,
                ],
            ]);

        $customerData = $response->json('data');
        $this->assertNotEmpty($customerData['customer_code']);
        $this->assertStringStartsWith('CUST-', $customerData['customer_code']);

        // Verify audit log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'CUSTOMER_CREATED',
            'auditable_type' => Customer::class,
            'auditable_id' => $customerData['id'],
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_customer_creation_validates_required_fields_and_uniqueness(): void
    {
        // Missing required fields
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/customers', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'phone']);

        // Duplicate customer code
        $dupResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/customers', [
                'customer_code' => 'CUST-00001',
                'name' => 'Duplicate Customer',
                'phone' => '+91 98765 00000',
            ]);

        $dupResponse->assertStatus(422)
            ->assertJsonValidationErrors(['customer_code']);

        // Invalid email format
        $emailResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/customers', [
                'name' => 'Bad Email Customer',
                'phone' => '+91 98765 00001',
                'email' => 'not-an-email',
            ]);

        $emailResponse->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_can_view_and_update_customer_details(): void
    {
        $customer = Customer::where('customer_code', 'CUST-00002')->first();

        // View
        $viewResp = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/customers/{$customer->id}");

        $viewResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $customer->id,
                    'name' => 'John Doe',
                    'customer_code' => 'CUST-00002',
                ],
            ]);

        // Update
        $updateResp = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/customers/{$customer->id}", [
                'name' => 'Johnathon Doe Senior',
                'phone' => '+91 98111 99999',
                'notes' => 'Updated notes for customer',
            ]);

        $updateResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Johnathon Doe Senior',
                    'phone' => '+91 98111 99999',
                    'notes' => 'Updated notes for customer',
                ],
            ]);

        // Verify Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'CUSTOMER_UPDATED',
            'auditable_type' => Customer::class,
            'auditable_id' => $customer->id,
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_can_toggle_customer_active_status(): void
    {
        $customer = Customer::where('customer_code', 'CUST-00002')->first();
        $this->assertTrue($customer->is_active);

        // Deactivate
        $toggleResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/customers/{$customer->id}/toggle-status");

        $toggleResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['is_active' => false],
            ]);

        $this->assertFalse($customer->fresh()->is_active);

        // Reactivate
        $toggleAgain = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/customers/{$customer->id}/toggle-status");

        $toggleAgain->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['is_active' => true],
            ]);

        $this->assertTrue($customer->fresh()->is_active);
    }

    public function test_can_safely_delete_customer_without_references(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-TEMPDEL',
            'name' => 'Temporary Delete Customer',
            'phone' => '+91 90000 00001',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/customers/{$customer->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Customer deleted successfully.',
            ]);

        // Soft deleted: row exists in database with deleted_at set
        $this->assertSoftDeleted('customers', ['id' => $customer->id]);

        // Verify audit log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'CUSTOMER_DELETED',
            'auditable_type' => Customer::class,
            'auditable_id' => $customer->id,
        ]);
    }

    public function test_prevents_unsafe_deletion_when_customer_has_active_references(): void
    {
        // Simulate a dependent transactional table from future phases
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers');
            $table->timestamps();
        });

        $customer = Customer::where('customer_code', 'CUST-00002')->first();

        // Create referencing record
        \Illuminate\Support\Facades\DB::table('sales_orders')->insert([
            'customer_id' => $customer->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/customers/{$customer->id}");

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error_code' => 'CUSTOMER_HAS_REFERENCES',
            ]);

        $this->assertNotSoftDeleted('customers', ['id' => $customer->id]);

        // Clean up mock table
        Schema::dropIfExists('sales_orders');
    }

    public function test_customer_permissions_guard_mutations_from_unauthorized_users(): void
    {
        // Cashier has no customers.manage permission
        // 1. Cannot create
        $respCreate = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/v1/customers', [
                'name' => 'Unauthorized Customer',
                'phone' => '+91 91111 22222',
            ]);
        $respCreate->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'PERMISSION_DENIED',
            ]);

        // 2. Cannot update
        $customer = Customer::where('customer_code', 'CUST-00002')->first();
        $respUpdate = $this->actingAs($this->cashier, 'sanctum')
            ->putJson("/api/v1/customers/{$customer->id}", [
                'name' => 'Hacked Name',
                'phone' => '+91 99999 88888',
            ]);
        $respUpdate->assertStatus(403);

        // 3. Cannot delete
        $respDelete = $this->actingAs($this->cashier, 'sanctum')
            ->deleteJson("/api/v1/customers/{$customer->id}");
        $respDelete->assertStatus(403);

        // 4. Cannot toggle status
        $respToggle = $this->actingAs($this->cashier, 'sanctum')
            ->postJson("/api/v1/customers/{$customer->id}/toggle-status");
        $respToggle->assertStatus(403);

        // BUT cashier CAN read / search customers for counter billing lookup
        $respRead = $this->actingAs($this->cashier, 'sanctum')
            ->getJson('/api/v1/customers?search=John');
        $respRead->assertStatus(200);
    }

    /*
    |--------------------------------------------------------------------------
    | Suppliers Master Tests
    |--------------------------------------------------------------------------
    */

    public function test_can_list_suppliers_with_pagination_and_meta(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/suppliers?per_page=2');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Suppliers retrieved successfully.',
            ])
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'supplier_code',
                        'name',
                        'contact_person',
                        'phone',
                        'email',
                        'is_active',
                    ],
                ],
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_can_filter_suppliers_by_status(): void
    {
        // Filter active
        $responseActive = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/suppliers?is_active=1');

        $responseActive->assertStatus(200);
        foreach ($responseActive->json('data') as $item) {
            $this->assertTrue($item['is_active']);
        }

        // Filter inactive
        $responseInactive = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/suppliers?is_active=0');

        $responseInactive->assertStatus(200);
        foreach ($responseInactive->json('data') as $item) {
            $this->assertFalse($item['is_active']);
        }
    }

    public function test_can_search_suppliers_by_name_phone_code_and_contact(): void
    {
        // By Name
        $respName = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/suppliers?search=Supreme Dairy');
        $respName->assertStatus(200);
        $this->assertTrue(collect($respName->json('data'))->contains('name', 'Supreme Dairy & Poultry Co.'));

        // By Contact Person
        $respContact = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/suppliers?search=Ramesh Patel');
        $respContact->assertStatus(200);
        $this->assertTrue(collect($respContact->json('data'))->contains('contact_person', 'Ramesh Patel'));

        // By Code
        $respCode = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/suppliers?search=SUP-00003');
        $respCode->assertStatus(200);
        $this->assertTrue(collect($respCode->json('data'))->contains('supplier_code', 'SUP-00003'));

        // By Phone
        $respPhone = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/suppliers?search=98300');
        $respPhone->assertStatus(200);
        $this->assertTrue(collect($respPhone->json('data'))->contains('name', 'Golden Harvest Bakery Supply'));
    }

    public function test_can_create_supplier_with_valid_details_and_auto_code(): void
    {
        $payload = [
            'name' => 'Metro Beverage Distributors Ltd',
            'contact_person' => 'Vikrant Deshmukh',
            'phone' => '+91 98888 77777',
            'alternate_phone' => '+91 98888 66666',
            'email' => 'orders@metrobev.com',
            'address' => 'Warehouse 12B, Port Logistics Zone',
            'city' => 'Harbor City',
            'state' => 'Tamil Nadu',
            'postal_code' => '600003',
            'tax_number' => 'GSTIN33AABCM9876R1Z5',
            'notes' => 'Exclusive distributor for branded juices and snacks',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/suppliers', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Metro Beverage Distributors Ltd',
                    'contact_person' => 'Vikrant Deshmukh',
                    'phone' => '+91 98888 77777',
                    'email' => 'orders@metrobev.com',
                    'is_active' => true,
                ],
            ]);

        $supplierData = $response->json('data');
        $this->assertNotEmpty($supplierData['supplier_code']);
        $this->assertStringStartsWith('SUP-', $supplierData['supplier_code']);

        // Verify audit log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'SUPPLIER_CREATED',
            'auditable_type' => Supplier::class,
            'auditable_id' => $supplierData['id'],
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_supplier_creation_validates_required_fields_and_uniqueness(): void
    {
        // Missing required fields
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/suppliers', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'phone']);

        // Duplicate supplier code
        $dupResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/suppliers', [
                'supplier_code' => 'SUP-00001',
                'name' => 'Duplicate Supplier',
                'phone' => '+91 98765 11111',
            ]);

        $dupResponse->assertStatus(422)
            ->assertJsonValidationErrors(['supplier_code']);

        // Invalid email format
        $emailResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/suppliers', [
                'name' => 'Bad Email Supplier',
                'phone' => '+91 98765 22222',
                'email' => 'invalid-email-address',
            ]);

        $emailResponse->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_can_view_and_update_supplier_details(): void
    {
        $supplier = Supplier::where('supplier_code', 'SUP-00001')->first();

        // View
        $viewResp = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/suppliers/{$supplier->id}");

        $viewResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $supplier->id,
                    'name' => 'Fresh Farm Agro Wholesale',
                    'supplier_code' => 'SUP-00001',
                ],
            ]);

        // Update
        $updateResp = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/suppliers/{$supplier->id}", [
                'name' => 'Fresh Farm Agro Wholesale & Organics',
                'phone' => '+91 98100 88888',
                'contact_person' => 'Ramesh Patel (Senior Partner)',
            ]);

        $updateResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Fresh Farm Agro Wholesale & Organics',
                    'phone' => '+91 98100 88888',
                    'contact_person' => 'Ramesh Patel (Senior Partner)',
                ],
            ]);

        // Verify Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'SUPPLIER_UPDATED',
            'auditable_type' => Supplier::class,
            'auditable_id' => $supplier->id,
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_can_toggle_supplier_active_status(): void
    {
        $supplier = Supplier::where('supplier_code', 'SUP-00001')->first();
        $this->assertTrue($supplier->is_active);

        // Deactivate
        $toggleResp = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/suppliers/{$supplier->id}/toggle-status");

        $toggleResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['is_active' => false],
            ]);

        $this->assertFalse($supplier->fresh()->is_active);

        // Reactivate
        $toggleAgain = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/suppliers/{$supplier->id}/toggle-status");

        $toggleAgain->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['is_active' => true],
            ]);

        $this->assertTrue($supplier->fresh()->is_active);
    }

    public function test_can_safely_delete_supplier_without_references(): void
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-TEMPDEL',
            'name' => 'Temporary Delete Supplier',
            'phone' => '+91 90000 00002',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/suppliers/{$supplier->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Supplier deleted successfully.',
            ]);

        // Soft deleted: row exists with deleted_at set
        $this->assertSoftDeleted('suppliers', ['id' => $supplier->id]);

        // Verify audit log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'SUPPLIER_DELETED',
            'auditable_type' => Supplier::class,
            'auditable_id' => $supplier->id,
        ]);
    }

    public function test_prevents_unsafe_deletion_when_supplier_has_active_references(): void
    {
        // Simulate a dependent transactional table from future phases (purchase_orders)
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->timestamps();
        });

        $supplier = Supplier::where('supplier_code', 'SUP-00001')->first();

        // Create referencing record
        \Illuminate\Support\Facades\DB::table('purchase_orders')->insert([
            'supplier_id' => $supplier->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/suppliers/{$supplier->id}");

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error_code' => 'SUPPLIER_HAS_REFERENCES',
            ]);

        $this->assertNotSoftDeleted('suppliers', ['id' => $supplier->id]);

        // Clean up mock table
        Schema::dropIfExists('purchase_orders');
    }

    public function test_supplier_permissions_guard_mutations_from_unauthorized_users(): void
    {
        // Cashier has no suppliers.manage permission
        // 1. Cannot create
        $respCreate = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/v1/suppliers', [
                'name' => 'Unauthorized Supplier',
                'phone' => '+91 92222 33333',
            ]);
        $respCreate->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'PERMISSION_DENIED',
            ]);

        // 2. Cannot update
        $supplier = Supplier::where('supplier_code', 'SUP-00001')->first();
        $respUpdate = $this->actingAs($this->cashier, 'sanctum')
            ->putJson("/api/v1/suppliers/{$supplier->id}", [
                'name' => 'Hacked Supplier Name',
                'phone' => '+91 98888 11111',
            ]);
        $respUpdate->assertStatus(403);

        // 3. Cannot delete
        $respDelete = $this->actingAs($this->cashier, 'sanctum')
            ->deleteJson("/api/v1/suppliers/{$supplier->id}");
        $respDelete->assertStatus(403);

        // 4. Cannot toggle status
        $respToggle = $this->actingAs($this->cashier, 'sanctum')
            ->postJson("/api/v1/suppliers/{$supplier->id}/toggle-status");
        $respToggle->assertStatus(403);

        // BUT cashier CAN read / search suppliers
        $respRead = $this->actingAs($this->cashier, 'sanctum')
            ->getJson('/api/v1/suppliers?search=Agro');
        $respRead->assertStatus(200);
    }
}

