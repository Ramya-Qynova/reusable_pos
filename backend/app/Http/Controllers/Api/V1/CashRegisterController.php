<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\CloseShiftRequest;
use App\Http\Requests\Sales\OpenShiftRequest;
use App\Http\Requests\Sales\RecordCashMovementRequest;
use App\Services\Sales\CashRegisterService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Validation\ValidationException;

class CashRegisterController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CashRegisterService $cashRegisterService
    ) {}

    /**
     * Get active shift status for authenticated user in active branch.
     */
    public function current(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $user = $request->user();

        $shift = $this->cashRegisterService->getCurrentShift($branch->id, $user->id);

        if ($shift) {
            $shift->load(['movements']);
            $shift->expected_balance = $shift->calculateExpectedBalance();
        }

        return $this->successResponse($shift, 'Active register shift retrieved.');
    }

    /**
     * Open a new cash drawer shift.
     */
    public function open(OpenShiftRequest $request): JsonResponse
    {
        $branch = app('active_branch');
        $user = $request->user();
        $openingBalance = (float) $request->input('opening_balance');
        $notes = $request->input('notes');

        $shift = $this->cashRegisterService->openShift($branch->id, $user->id, $openingBalance, $notes);

        return $this->successResponse($shift, 'Cash drawer shift opened successfully.', Response::HTTP_CREATED);
    }

    /**
     * Close the current active register shift.
     */
    public function close(CloseShiftRequest $request): JsonResponse
    {
        $branch = app('active_branch');
        $user = $request->user();

        $activeShift = $this->cashRegisterService->getCurrentShift($branch->id, $user->id);
        if (!$activeShift) {
            throw ValidationException::withMessages([
                'shift' => ['No active open shift found to close.']
            ]);
        }

        $actualClosingBalance = (float) $request->input('actual_closing_balance');
        $notes = $request->input('notes');

        $shift = $this->cashRegisterService->closeShift($activeShift->id, $user->id, $actualClosingBalance, $notes);

        return $this->successResponse($shift, 'Cash drawer shift closed successfully.');
    }

    /**
     * Record a cash movement (cash in / cash out).
     */
    public function recordMovement(RecordCashMovementRequest $request): JsonResponse
    {
        $branch = app('active_branch');
        $user = $request->user();

        $activeShift = $this->cashRegisterService->getCurrentShift($branch->id, $user->id);
        if (!$activeShift) {
            throw ValidationException::withMessages([
                'shift' => ['Please open a cash drawer shift before recording cash movements.']
            ]);
        }

        $movement = $this->cashRegisterService->recordMovement(
            $activeShift->id,
            $user->id,
            $request->input('type'),
            (float) $request->input('amount'),
            $request->input('reason')
        );

        return $this->successResponse($movement, 'Cash movement recorded successfully.', Response::HTTP_CREATED);
    }

    /**
     * List paginated shifts history for the active branch.
     */
    public function shifts(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $userId = $request->input('user_id') ? (int) $request->input('user_id') : null;
        $perPage = (int) $request->input('per_page', 15);

        $history = $this->cashRegisterService->getShiftHistory($branch->id, $userId, $perPage);

        return $this->paginatedResponse($history, 'Shift history retrieved successfully.');
    }
}
