<?php

namespace App\Services\Auth;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Authenticate user via email/password or PIN
     */
    public function authenticate(array $credentials, ?string $ipAddress = null): array
    {
        $user = null;

        if (!empty($credentials['email'])) {
            $user = User::query()->where('email', $credentials['email'])->first();

            if (!$user || !Hash::check($credentials['password'], $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['Invalid credentials provided.'],
                ]);
            }
        } elseif (!empty($credentials['pin_code'])) {
            // Counter PIN login: check users with matching PIN
            $users = User::query()->where('is_active', true)->whereNotNull('pin_code')->get();
            foreach ($users as $candidate) {
                if (Hash::check($credentials['pin_code'], $candidate->pin_code)) {
                    $user = $candidate;
                    break;
                }
            }

            if (!$user) {
                throw ValidationException::withMessages([
                    'pin_code' => ['Invalid counter PIN code.'],
                ]);
            }
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This user account has been deactivated.'],
            ]);
        }

        // Update last login
        $user->update(['last_login_at' => now()]);

        // Create Sanctum Token
        $token = $user->createToken('pos_auth_token')->plainTextToken;

        // Retrieve accessible branches
        $accessibleBranches = $user->is_super_admin
            ? Branch::query()->where('is_active', true)->get()
            : $user->branches()->where('is_active', true)->get();

        // Determine default active branch
        $activeBranch = null;
        if (!empty($credentials['branch_id'])) {
            $activeBranch = $accessibleBranches->firstWhere('id', (int) $credentials['branch_id']);
        }

        if (!$activeBranch) {
            $activeBranch = $accessibleBranches->firstWhere('is_main_branch', true) ?? $accessibleBranches->first();
        }

        // Log audit event
        AuditLog::create([
            'user_id' => $user->id,
            'branch_id' => $activeBranch?->id,
            'action' => 'USER_LOGIN',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->is_super_admin,
            ],
            'active_branch' => $activeBranch ? [
                'id' => $activeBranch->id,
                'name' => $activeBranch->name,
                'branch_code' => $activeBranch->branch_code,
                'location' => $activeBranch->location,
                'is_main_branch' => $activeBranch->is_main_branch,
            ] : null,
            'accessible_branches' => $accessibleBranches->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'branch_code' => $b->branch_code,
                'location' => $b->location,
                'is_main_branch' => $b->is_main_branch,
            ]),
        ];
    }

    /**
     * Log out current user & revoke tokens
     */
    public function logout(User $user, ?string $ipAddress = null): void
    {
        $user->currentAccessToken()->delete();

        AuditLog::create([
            'user_id' => $user->id,
            'branch_id' => app()->bound('active_branch') ? app('active_branch')->id : null,
            'action' => 'USER_LOGOUT',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }
}

