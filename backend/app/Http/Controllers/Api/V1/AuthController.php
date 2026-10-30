<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Branch;
use App\Services\Auth\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected AuthService $authService
    ) {}

    /**
     * User login with email/password or PIN
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->authenticate(
            $request->validated(),
            $request->ip()
        );

        return $this->successResponse(
            $result,
            'Authentication successful.',
            Response::HTTP_OK
        );
    }

    /**
     * Get authenticated user profile & current branch context
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $accessibleBranches = $user->is_super_admin
            ? Branch::query()->where('is_active', true)->get()
            : $user->branches()->where('is_active', true)->get();

        $activeBranchId = $request->header('X-Branch-ID');
        $activeBranch = null;

        if ($activeBranchId) {
            $activeBranch = $accessibleBranches->firstWhere('id', (int) $activeBranchId);
        }

        if (!$activeBranch) {
            $activeBranch = $accessibleBranches->firstWhere('is_main_branch', true) ?? $accessibleBranches->first();
        }

        $activeRole = $activeBranch ? $user->getRoleInBranch($activeBranch->id) : null;

        return $this->successResponse([
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
            'active_role' => $user->is_super_admin ? [
                'name' => 'Super Administrator',
                'slug' => 'super_admin',
            ] : ($activeRole ? [
                'name' => $activeRole->name,
                'slug' => $activeRole->slug,
            ] : null),
            'accessible_branches' => $accessibleBranches->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'branch_code' => $b->branch_code,
                'location' => $b->location,
                'is_main_branch' => $b->is_main_branch,
            ]),
        ], 'Profile retrieved successfully.');
    }

    /**
     * Terminate user session & revoke token
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user(), $request->ip());

        return $this->successResponse(
            null,
            'Logged out successfully.'
        );
    }
}

