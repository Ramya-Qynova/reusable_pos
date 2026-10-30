<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BusinessFeature;
use App\Models\BusinessProfile;
use App\Models\TaxSlab;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
     * Get tax slabs
     */
    public function taxSlabs(): JsonResponse
    {
        $slabs = TaxSlab::query()->where('is_active', true)->get();

        return $this->successResponse(
            $slabs->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'rate' => (float) $s->rate,
                'cgst_rate' => (float) $s->cgst_rate,
                'sgst_rate' => (float) $s->sgst_rate,
                'igst_rate' => (float) $s->igst_rate,
            ]),
            'Tax slabs retrieved successfully.'
        );
    }
}

