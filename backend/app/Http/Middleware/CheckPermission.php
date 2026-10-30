<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    use ApiResponse;

    /**
     * Handle an incoming request and enforce role/permission and branch access.
     */
    public function handle(Request $request, Closure $next, string $permissionSlug): Response
    {
        $user = $request->user();

        if (!$user) {
            return $this->errorResponse(
                'Unauthenticated.',
                Response::HTTP_UNAUTHORIZED,
                null,
                'UNAUTHENTICATED'
            );
        }

        if ($user->is_super_admin) {
            return $next($request);
        }

        $branchId = $request->header('X-Branch-ID') ?: $request->input('branch_id');

        // 1. If branch context is supplied, ensure user can access that branch
        if ($branchId && !$user->canAccessBranch((int) $branchId)) {
            return $this->errorResponse(
                "You are not authorized to perform operations in branch ID [{$branchId}].",
                Response::HTTP_FORBIDDEN,
                null,
                'BRANCH_ACCESS_DENIED'
            );
        }

        // 2. Ensure user possesses the required permission (in the target branch or globally)
        if (!$user->hasPermission($permissionSlug, $branchId ? (int) $branchId : null)) {
            return $this->errorResponse(
                "You do not possess the required permission [{$permissionSlug}] to perform this action.",
                Response::HTTP_FORBIDDEN,
                null,
                'PERMISSION_DENIED'
            );
        }

        return $next($request);
    }
}
