<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\BusinessFeature;
use App\Models\BusinessProfile;
use App\Models\Permission;
use App\Models\Role;
use App\Models\TaxSlab;
use App\Models\User;
use App\Models\UserBranchRole;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class SettingsController extends Controller
{
    use ApiResponse;

    /**
     * Get central business store profile
     */
    public function profile(): JsonResponse
    {
        $profile = BusinessProfile::first();

        return $this->successResponse([
            'id' => $profile?->id,
            'client_name' => $profile?->business_name,
            'legal_name' => $profile?->legal_name,
            'tax_id' => $profile?->tax_id,
            'currency_code' => $profile?->currency_code,
            'currency_symbol' => $profile?->currency_symbol,
            'timezone' => $profile?->timezone,
            'business_type' => $profile?->active_vertical,
            'email' => $profile?->email,
            'phone' => $profile?->phone,
            'address' => $profile?->address,
        ], 'Business profile retrieved successfully.');
    }

    /**
     * Update business profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:191',
            'legal_name' => 'nullable|string|max:191',
            'tax_id' => 'nullable|string|max:50',
            'currency_code' => 'nullable|string|max:10',
            'currency_symbol' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:191',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
        ]);

        $profile = BusinessProfile::first() ?? new BusinessProfile();
        $profile->business_name = $validated['client_name'];
        $profile->legal_name = $validated['legal_name'] ?? $profile->legal_name;
        $profile->tax_id = $validated['tax_id'] ?? $profile->tax_id;
        $profile->currency_code = $validated['currency_code'] ?? $profile->currency_code;
        $profile->currency_symbol = $validated['currency_symbol'] ?? $profile->currency_symbol;
        $profile->timezone = $validated['timezone'] ?? $profile->timezone;
        $profile->email = $validated['email'] ?? $profile->email;
        $profile->phone = $validated['phone'] ?? $profile->phone;
        $profile->address = $validated['address'] ?? $profile->address;
        $profile->save();

        return $this->profile();
    }

    /**
     * Get active vertical feature flags
     */
    public function features(): JsonResponse
    {
        $features = BusinessFeature::all()->pluck('is_enabled', 'feature_key');

        return $this->successResponse(
            $features,
            'Business vertical feature flags retrieved successfully.'
        );
    }

    /**
     * Update feature flags
     */
    public function updateFeatures(Request $request): JsonResponse
    {
        $features = $request->input('features', []);
        foreach ($features as $key => $enabled) {
            BusinessFeature::updateOrCreate(
                ['feature_key' => $key],
                ['is_enabled' => (bool) $enabled]
            );
        }

        return $this->features();
    }

    /**
     * Get all app settings grouped by category
     */
    public function allSettings(): JsonResponse
    {
        $settings = AppSetting::all()->groupBy('group');
        $result = [];

        foreach ($settings as $group => $items) {
            $groupMap = [];
            foreach ($items as $item) {
                $groupMap[$item->key] = match ($item->type) {
                    'boolean' => filter_var($item->value, FILTER_VALIDATE_BOOLEAN),
                    'integer' => (int) $item->value,
                    'json' => json_decode($item->value, true),
                    default => $item->value,
                };
            }
            $result[$group] = $groupMap;
        }

        return $this->successResponse($result, 'Application settings retrieved.');
    }

    /**
     * Save application settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $settings = $request->input('settings', []);
        $group = $request->input('group', 'general');

        foreach ($settings as $key => $value) {
            AppSetting::set($key, $value, $group);
        }

        return $this->allSettings();
    }

    /**
     * Get tax slabs
     */
    public function taxSlabs(): JsonResponse
    {
        $slabs = TaxSlab::query()->get();

        return $this->successResponse(
            $slabs->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'rate' => (float) $s->rate,
                'cgst_rate' => (float) $s->cgst_rate,
                'sgst_rate' => (float) $s->sgst_rate,
                'igst_rate' => (float) $s->igst_rate,
                'is_active' => (bool) $s->is_active,
            ]),
            'Tax slabs retrieved successfully.'
        );
    }

    /**
     * Store or update tax slab
     */
    public function storeTaxSlab(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => 'nullable|integer|exists:tax_slabs,id',
            'name' => 'required|string|max:100',
            'rate' => 'required|numeric|min:0|max:100',
            'cgst_rate' => 'nullable|numeric|min:0|max:100',
            'sgst_rate' => 'nullable|numeric|min:0|max:100',
            'igst_rate' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        $slab = TaxSlab::updateOrCreate(
            ['id' => $validated['id'] ?? null],
            [
                'name' => $validated['name'],
                'rate' => $validated['rate'],
                'cgst_rate' => $validated['cgst_rate'] ?? ($validated['rate'] / 2),
                'sgst_rate' => $validated['sgst_rate'] ?? ($validated['rate'] / 2),
                'igst_rate' => $validated['igst_rate'] ?? $validated['rate'],
                'is_active' => $validated['is_active'] ?? true,
            ]
        );

        return $this->successResponse($slab, 'Tax slab saved.');
    }

    /**
     * User management
     */
    public function users(): JsonResponse
    {
        $users = User::with(['userBranchRoles.branch:id,name,branch_code', 'userBranchRoles.role:id,name,slug'])
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'is_super_admin' => $u->is_super_admin,
                    'is_active' => $u->is_active,
                    'created_at' => $u->created_at?->format('d M Y'),
                    'branch_roles' => $u->userBranchRoles->map(fn ($ubr) => [
                        'branch' => $ubr->branch?->name,
                        'branch_id' => $ubr->branch_id,
                        'role' => $ubr->role?->name,
                        'role_id' => $ubr->role_id,
                    ]),
                ];
            });

        return $this->successResponse($users, 'Staff users retrieved.');
    }

    /**
     * Store new user
     */
    public function storeUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:6',
            'pin_code' => 'nullable|string|min:4',
            'is_super_admin' => 'nullable|boolean',
            'branch_id' => 'required|integer|exists:branches,id',
            'role_id' => 'required|integer|exists:roles,id',
        ]);

        $user = DB::transaction(function () use ($validated) {
            $created = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'pin_code' => !empty($validated['pin_code']) ? Hash::make($validated['pin_code']) : null,
                'is_super_admin' => $validated['is_super_admin'] ?? false,
                'is_active' => true,
            ]);

            UserBranchRole::create([
                'user_id' => $created->id,
                'branch_id' => $validated['branch_id'],
                'role_id' => $validated['role_id'],
            ]);

            return $created;
        });

        return $this->successResponse($user, 'User created successfully.', Response::HTTP_CREATED);
    }

    /**
     * Roles & Permissions matrix
     */
    public function roles(): JsonResponse
    {
        $roles = Role::with('permissions:id,slug,module,description')->get();
        $allPermissions = Permission::orderBy('module')->get();

        return $this->successResponse([
            'roles' => $roles,
            'all_permissions' => $allPermissions,
        ], 'Roles and permissions matrix retrieved.');
    }

    /**
     * Update permissions assigned to a role
     */
    public function updateRolePermissions(Request $request, Role $role): JsonResponse
    {
        $permissionIds = $request->input('permission_ids', []);
        $role->permissions()->sync($permissionIds);

        return $this->successResponse($role->load('permissions'), 'Role permissions updated successfully.');
    }

    /**
     * System health diagnostic report
     */
    public function systemHealth(): JsonResponse
    {
        $tables = [
            'products' => \App\Models\Product::count(),
            'branch_stocks' => \App\Models\BranchStock::count(),
            'sales_orders' => \App\Models\SalesOrder::count(),
            'customers' => \App\Models\Customer::count(),
            'suppliers' => \App\Models\Supplier::count(),
            'purchase_orders' => \App\Models\PurchaseOrder::count(),
            'branches' => Branch::count(),
            'users' => User::count(),
        ];

        return $this->successResponse([
            'app_environment' => config('app.env'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'database_connection' => config('database.default'),
            'record_counts' => $tables,
            'server_time' => now()->toIso8601String(),
            'last_backup' => 'Automatic daily snapshot enabled',
        ], 'System health diagnostics retrieved.');
    }
}
