<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Products\StoreUnitRequest;
use App\Http\Requests\Products\UpdateUnitRequest;
use App\Models\Unit;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class UnitController extends Controller
{
    use ApiResponse;

    /**
     * List all units of measurement
     */
    public function index(): JsonResponse
    {
        $units = Unit::orderBy('name')->get();

        return $this->successResponse(
            $units,
            'Units retrieved successfully.'
        );
    }

    /**
     * Store new unit
     */
    public function store(StoreUnitRequest $request): JsonResponse
    {
        $unit = Unit::create($request->validated());

        return $this->successResponse(
            $unit,
            'Unit created successfully.',
            Response::HTTP_CREATED
        );
    }

    /**
     * Show unit
     */
    public function show(Unit $unit): JsonResponse
    {
        return $this->successResponse(
            $unit,
            'Unit retrieved successfully.'
        );
    }

    /**
     * Update unit
     */
    public function update(UpdateUnitRequest $request, Unit $unit): JsonResponse
    {
        $unit->update($request->validated());

        return $this->successResponse(
            $unit->fresh(),
            'Unit updated successfully.'
        );
    }

    /**
     * Delete unit
     */
    public function destroy(Unit $unit): JsonResponse
    {
        if ($unit->products()->exists()) {
            return $this->errorResponse(
                'Cannot delete unit because it is assigned to existing products.',
                Response::HTTP_CONFLICT,
                null,
                'UNIT_ASSIGNED_TO_PRODUCTS'
            );
        }

        $unit->delete();

        return $this->successResponse(
            null,
            'Unit deleted successfully.'
        );
    }
}

