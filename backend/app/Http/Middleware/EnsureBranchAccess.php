<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBranchAccess
{
    use ApiResponse;

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $branchId = $request->header('X-Branch-ID');

        if (!$branchId) {
            return $this->errorResponse(
                'Active branch context is required. Please provide X-Branch-ID header.',
                Response::HTTP_BAD_REQUEST,
                null,
                'BRANCH_HEADER_MISSING'
            );
        }

        $branch = Branch::query()->where('is_active', true)->find($branchId);

        if (!$branch) {
            return $this->errorResponse(
                'Invalid or inactive branch specified.',
                Response::HTTP_NOT_FOUND,
                null,
                'BRANCH_NOT_FOUND'
            );
        }

        $user = $request->user();

        if (!$user) {
            return $this->errorResponse(
                'Unauthenticated.',
                Response::HTTP_UNAUTHORIZED,
                null,
                'UNAUTHENTICATED'
            );
        }

        if (!$user->canAccessBranch($branch->id)) {
            return $this->errorResponse(
                "You are not authorized to perform operations in branch [{$branch->name}].",
                Response::HTTP_FORBIDDEN,
                null,
                'BRANCH_ACCESS_DENIED'
            );
        }

        // Bind active branch and active branch role into the application container
        app()->instance('active_branch', $branch);
        
        $role = $user->is_super_admin
            ? (object) ['name' => 'Super Administrator', 'slug' => 'super_admin']
            : ($user->getRoleInBranch($branch->id) ?? (object) ['name' => 'Staff', 'slug' => 'staff']);

        app()->instance('active_branch_role', $role);

        return $next($request);
    }
}
