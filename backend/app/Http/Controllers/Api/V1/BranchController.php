<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BranchController extends Controller
{
    use ApiResponse;

    /**
     * List all accessible branches for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $branches = $user->is_super_admin
            ? Branch::query()->where('is_active', true)->get()
            : $user->branches()->where('is_active', true)->get();

        return $this->successResponse(
            $branches->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'branch_code' => $b->branch_code,
                'location' => $b->location,
                'address' => $b->address,
                'phone' => $b->phone,
                'email' => $b->email,
                'is_main_branch' => $b->is_main_branch,
            ]),
            'Accessible branches retrieved successfully.'
        );
    }

    /**
     * Get details of currently active branch
     */
    public function current(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $role = app()->bound('active_branch_role') ? app('active_branch_role') : null;

        return $this->successResponse([
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'branch_code' => $branch->branch_code,
                'location' => $branch->location,
                'address' => $branch->address,
                'phone' => $branch->phone,
                'email' => $branch->email,
                'is_main_branch' => $branch->is_main_branch,
            ],
            'user_role_in_branch' => $request->user()->is_super_admin ? [
                'name' => 'Super Administrator',
                'slug' => 'super_admin',
            ] : ($role ? [
                'name' => $role->name,
                'slug' => $role->slug,
            ] : null),
        ], 'Current branch context verified.');
    }
}
