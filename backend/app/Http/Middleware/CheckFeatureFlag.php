<?php

namespace App\Http\Middleware;

use App\Models\BusinessFeature;
use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckFeatureFlag
{
    use ApiResponse;

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $featureKey): Response
    {
        $feature = BusinessFeature::query()->where('feature_key', $featureKey)->first();

        if (!$feature || !$feature->is_enabled) {
            return $this->errorResponse(
                "The requested feature [{$featureKey}] is not enabled for this business vertical.",
                Response::HTTP_FORBIDDEN,
                null,
                'FEATURE_DISABLED'
            );
        }

        return $next($request);
    }
}

