<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase1AuthAndBranchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_can_retrieve_business_profile_publicly(): void
    {
        $response = $this->getJson('/api/v1/settings/profile');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'client_name' => 'Green Mart Supermarket',
                    'tax_id' => 'GSTIN33AABCG1234F1Z5',
                    'currency_symbol' => '₹',
                    'business_type' => 'supermarket',
                ],
            ]);
    }

    public function test_can_retrieve_features_publicly(): void
    {
        $response = $this->getJson('/api/v1/settings/features');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'weightScaleBilling' => true,
                    'perishableStock' => true,
                    'barcodeScanning' => true,
                    'tableManagement' => false,
                ],
            ]);
    }

    public function test_user_can_login_with_valid_email_and_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@greenmart.pos',
            'password' => 'admin123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'token',
                    'user' => ['id', 'name', 'email', 'is_super_admin'],
                    'active_branch' => ['id', 'name', 'branch_code'],
                    'accessible_branches',
                ],
            ]);
    }

    public function test_user_cannot_login_with_invalid_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@greenmart.pos',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_FAILED',
            ]);
    }

    public function test_cashier_can_login_with_pin_code(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'pin_code' => '5678',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'cashier@greenmart.pos',
                    ],
                ],
            ]);
    }

    public function test_authenticated_user_can_access_me_endpoint(): void
    {
        $user = User::where('email', 'admin@greenmart.pos')->first();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'admin@greenmart.pos',
                        'is_super_admin' => true,
                    ],
                ],
            ]);
    }

    public function test_branch_authorization_allows_authorized_cashier(): void
    {
        $cashier = User::where('email', 'cashier@greenmart.pos')->first();
        $mainBranch = Branch::where('branch_code', 'MAIN')->first();

        $response = $this->actingAs($cashier, 'sanctum')
            ->withHeader('X-Branch-ID', (string) $mainBranch->id)
            ->getJson('/api/v1/branches/current');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'branch' => [
                        'id' => $mainBranch->id,
                        'name' => 'Main Branch',
                    ],
                    'user_role_in_branch' => [
                        'slug' => 'cashier',
                    ],
                ],
            ]);
    }

    public function test_branch_authorization_denies_unauthorized_branch(): void
    {
        $cashier = User::where('email', 'cashier@greenmart.pos')->first();
        // Cashier is assigned to MAIN and NORTH, but NOT to METRO (Sector 4 Galleria)
        $metroBranch = Branch::where('branch_code', 'METRO')->first();

        $response = $this->actingAs($cashier, 'sanctum')
            ->withHeader('X-Branch-ID', (string) $metroBranch->id)
            ->getJson('/api/v1/branches/current');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'BRANCH_ACCESS_DENIED',
            ]);
    }

    public function test_super_admin_has_unrestricted_access_to_all_branches(): void
    {
        $superAdmin = User::where('email', 'admin@greenmart.pos')->first();
        $metroBranch = Branch::where('branch_code', 'METRO')->first();

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->withHeader('X-Branch-ID', (string) $metroBranch->id)
            ->getJson('/api/v1/branches/current');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'branch' => [
                        'id' => $metroBranch->id,
                        'name' => 'Metro Center',
                    ],
                    'user_role_in_branch' => [
                        'slug' => 'super_admin',
                    ],
                ],
            ]);
    }

    public function test_missing_branch_header_returns_400_on_branch_guarded_routes(): void
    {
        $user = User::where('email', 'admin@greenmart.pos')->first();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/branches/current');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'error_code' => 'BRANCH_HEADER_MISSING',
            ]);
    }
}

