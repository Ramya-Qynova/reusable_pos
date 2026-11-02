<?php

namespace App\Services\Sales;

use App\Models\AuditLog;
use App\Models\CashMovement;
use App\Models\CashRegisterShift;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashRegisterService
{
    /**
     * Get the active open shift for a user in a branch.
     */
    public function getCurrentShift(int $branchId, int $userId): ?CashRegisterShift
    {
        return CashRegisterShift::where('branch_id', $branchId)
            ->where('user_id', $userId)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();
    }

    /**
     * Open a new cash drawer shift.
     */
    public function openShift(int $branchId, int $userId, float $openingBalance, ?string $notes = null): CashRegisterShift
    {
        $existing = $this->getCurrentShift($branchId, $userId);
        if ($existing) {
            throw ValidationException::withMessages([
                'shift' => ['You already have an active open cash drawer shift in this branch.']
            ]);
        }

        return DB::transaction(function () use ($branchId, $userId, $openingBalance, $notes) {
            $shift = CashRegisterShift::create([
                'branch_id' => $branchId,
                'user_id' => $userId,
                'opened_at' => now(),
                'opening_balance' => round($openingBalance, 2),
                'cash_sales_amount' => 0.00,
                'cash_in_amount' => 0.00,
                'cash_out_amount' => 0.00,
                'expected_closing_balance' => round($openingBalance, 2),
                'status' => 'open',
                'opening_notes' => $notes,
            ]);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $branchId,
                'action' => 'CASH_SHIFT_OPENED',
                'auditable_type' => CashRegisterShift::class,
                'auditable_id' => $shift->id,
                'new_values' => [
                    'opening_balance' => $shift->opening_balance,
                    'opened_at' => $shift->opened_at->toIso8601String(),
                ],
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'created_at' => now(),
            ]);

            return $shift;
        });
    }

    /**
     * Close an active shift with actual cash count and discrepancy tracking.
     */
    public function closeShift(int $shiftId, int $userId, float $actualClosingBalance, ?string $notes = null): CashRegisterShift
    {
        return DB::transaction(function () use ($shiftId, $userId, $actualClosingBalance, $notes) {
            $shift = CashRegisterShift::where('id', $shiftId)
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();

            if (!$shift) {
                throw ValidationException::withMessages([
                    'shift' => ['Active shift not found or already closed.']
                ]);
            }

            $expected = $shift->calculateExpectedBalance();
            $actual = round($actualClosingBalance, 2);
            $difference = round($actual - $expected, 2);

            $shift->update([
                'closed_at' => now(),
                'expected_closing_balance' => $expected,
                'actual_closing_balance' => $actual,
                'difference' => $difference,
                'status' => 'closed',
                'closing_notes' => $notes,
            ]);

            AuditLog::create([
                'user_id' => $userId,
                'branch_id' => $shift->branch_id,
                'action' => 'CASH_SHIFT_CLOSED',
                'auditable_type' => CashRegisterShift::class,
                'auditable_id' => $shift->id,
                'old_values' => [
                    'status' => 'open',
                    'opening_balance' => $shift->opening_balance,
                ],
                'new_values' => [
                    'status' => 'closed',
                    'expected_closing_balance' => $expected,
                    'actual_closing_balance' => $actual,
                    'difference' => $difference,
                    'closed_at' => $shift->closed_at->toIso8601String(),
                ],
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'created_at' => now(),
            ]);

            return $shift;
        });
    }

    /**
     * Record cash movement (cash in / cash out).
     */
    public function recordMovement(int $shiftId, int $userId, string $type, float $amount, string $reason): CashMovement
    {
        if (!in_array($type, ['cash_in', 'cash_out'])) {
            throw ValidationException::withMessages([
                'type' => ['Invalid movement type. Must be cash_in or cash_out.']
            ]);
        }

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Amount must be greater than zero.']
            ]);
        }

        return DB::transaction(function () use ($shiftId, $userId, $type, $amount, $reason) {
            $shift = CashRegisterShift::where('id', $shiftId)
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();

            if (!$shift) {
                throw ValidationException::withMessages([
                    'shift' => ['Active cash shift not found or closed.']
                ]);
            }

            $movement = CashMovement::create([
                'cash_register_shift_id' => $shift->id,
                'branch_id' => $shift->branch_id,
                'user_id' => $userId,
                'type' => $type,
                'amount' => round($amount, 2),
                'reason' => $reason,
            ]);

            if ($type === 'cash_in') {
                $shift->increment('cash_in_amount', round($amount, 2));
            } else {
                $shift->increment('cash_out_amount', round($amount, 2));
            }

            $shift->update([
                'expected_closing_balance' => $shift->calculateExpectedBalance()
            ]);

            return $movement;
        });
    }

    /**
     * Add cash sales amount to shift.
     */
    public function recordCashSale(int $shiftId, float $amount): void
    {
        $shift = CashRegisterShift::where('id', $shiftId)->first();
        if ($shift && $shift->status === 'open') {
            $shift->increment('cash_sales_amount', round($amount, 2));
            $shift->update([
                'expected_closing_balance' => $shift->calculateExpectedBalance()
            ]);
        }
    }

    /**
     * Reverse cash sales amount in shift (e.g. upon sale cancellation).
     */
    public function reverseCashSale(int $shiftId, float $amount): void
    {
        $shift = CashRegisterShift::where('id', $shiftId)->first();
        if ($shift && $shift->status === 'open') {
            $currentSales = (float) $shift->cash_sales_amount;
            $newSales = max(0, round($currentSales - $amount, 2));
            $shift->update([
                'cash_sales_amount' => $newSales,
                'expected_closing_balance' => round((float) $shift->opening_balance + $newSales + (float) $shift->cash_in_amount - (float) $shift->cash_out_amount, 2)
            ]);
        }
    }

    /**
     * Get paginated shift history for a branch.
     */
    public function getShiftHistory(int $branchId, ?int $userId = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = CashRegisterShift::with(['user', 'movements'])
            ->where('branch_id', $branchId)
            ->latest('opened_at');

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->paginate($perPage);
    }
}
