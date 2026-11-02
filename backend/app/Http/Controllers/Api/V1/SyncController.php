<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\SyncTransaction;
use App\Models\TaxSlab;
use App\Models\Unit;
use App\Services\Sales\SalesService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SyncController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected SalesService $salesService
    ) {}

    /**
     * Heartbeat & connection status check
     */
    public function status(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : 1;

        return $this->successResponse([
            'online' => true,
            'server_timestamp' => now()->toIso8601String(),
            'branch_id' => $branchId,
            'pending_server_jobs' => 0,
        ], 'System is online and operational.');
    }

    /**
     * Pull authorized catalog and customer master records for offline local cache
     */
    public function pull(Request $request): JsonResponse
    {
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : 1;
        $since = $request->input('since') ? Carbon::parse($request->input('since')) : null;

        $productQuery = Product::query()
            ->with([
                'category:id,name',
                'brand:id,name',
                'unit:id,name,short_code',
                'taxSlab:id,name,rate',
                'variants',
                'stocks' => fn ($sq) => $sq->where('branch_id', $branchId),
            ])
            ->where('is_active', true);

        if ($since) {
            $productQuery->where('updated_at', '>=', $since);
        }

        $products = $productQuery->get()->map(function ($p) use ($branchId) {
            $pricing = $p->getEffectivePrice($branchId);
            $stock = $p->stocks->first();

            return [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'barcode' => $p->barcode,
                'category_id' => $p->category_id,
                'category_name' => $p->category?->name,
                'brand_name' => $p->brand?->name,
                'unit_id' => $p->unit_id,
                'unit_code' => $p->unit?->short_code,
                'selling_price' => $pricing['selling_price'],
                'mrp' => (float) $p->mrp,
                'cost_price' => (float) $p->cost_price,
                'tax_rate' => (float) $p->tax_rate,
                'is_tax_inclusive' => (bool) $p->is_tax_inclusive,
                'stock_quantity' => $stock ? (float) $stock->quantity : 0.000,
                'variants' => $p->variants,
            ];
        });

        $customerQuery = Customer::query()->where('is_active', true);
        if ($since) {
            $customerQuery->where('updated_at', '>=', $since);
        }
        $customers = $customerQuery->get(['id', 'customer_code', 'name', 'phone', 'email', 'credit_limit', 'current_balance', 'loyalty_points']);

        $categories = Category::query()->where('is_active', true)->get(['id', 'name', 'slug']);
        $units = Unit::query()->get(['id', 'name', 'short_code', 'allow_decimals']);
        $taxSlabs = TaxSlab::query()->where('is_active', true)->get();

        return $this->successResponse([
            'products' => $products,
            'customers' => $customers,
            'categories' => $categories,
            'units' => $units,
            'tax_slabs' => $taxSlabs,
            'pulled_at' => now()->toIso8601String(),
        ], 'Offline cache records synchronized.');
    }

    /**
     * Push pending offline transactions with idempotency protection
     */
    public function push(Request $request): JsonResponse
    {
        $transactions = $request->input('transactions', []);
        $branchId = $request->header('X-Branch-ID') ? (int) $request->header('X-Branch-ID') : 1;
        $user = $request->user();
        $branch = \App\Models\Branch::find($branchId) ?? \App\Models\Branch::first();

        if (empty($transactions) || !is_array($transactions)) {
            return $this->errorResponse('No offline transactions payload provided.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $processed = [];
        $failed = [];

        foreach ($transactions as $txn) {
            $idempotencyKey = $txn['idempotency_key'] ?? null;
            if (!$idempotencyKey) {
                $failed[] = [
                    'idempotency_key' => null,
                    'error' => 'Missing idempotency key.',
                ];
                continue;
            }

            // Check if already processed (prevent duplicate transaction creation)
            $existing = SyncTransaction::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                $processed[] = [
                    'idempotency_key' => $idempotencyKey,
                    'status' => 'already_processed',
                    'entity_id' => $existing->entity_id,
                    'entity_type' => $existing->entity_type,
                ];
                continue;
            }

            $opType = $txn['operation_type'] ?? 'offline_sale';
            $payload = $txn['payload'] ?? [];

            DB::beginTransaction();
            try {
                if ($opType === 'offline_sale' || $opType === 'sale') {
                    // Create sale order via existing SalesService
                    $sale = $this->salesService->createSale($payload, $user, $branch);

                    SyncTransaction::create([
                        'idempotency_key' => $idempotencyKey,
                        'branch_id' => $branchId,
                        'user_id' => $user?->id,
                        'operation_type' => 'offline_sale',
                        'entity_type' => 'sales_order',
                        'entity_id' => $sale->id,
                        'payload' => $payload,
                        'status' => 'success',
                        'client_timestamp' => isset($txn['created_at']) ? Carbon::parse($txn['created_at']) : now(),
                        'synced_at' => now(),
                    ]);

                    $processed[] = [
                        'idempotency_key' => $idempotencyKey,
                        'status' => 'created',
                        'entity_id' => $sale->id,
                        'invoice_number' => $sale->invoice_number,
                    ];
                } elseif ($opType === 'create_customer') {
                    $customer = Customer::create($payload);

                    SyncTransaction::create([
                        'idempotency_key' => $idempotencyKey,
                        'branch_id' => $branchId,
                        'user_id' => $user?->id,
                        'operation_type' => 'create_customer',
                        'entity_type' => 'customer',
                        'entity_id' => $customer->id,
                        'payload' => $payload,
                        'status' => 'success',
                        'client_timestamp' => isset($txn['created_at']) ? Carbon::parse($txn['created_at']) : now(),
                        'synced_at' => now(),
                    ]);

                    $processed[] = [
                        'idempotency_key' => $idempotencyKey,
                        'status' => 'created',
                        'entity_id' => $customer->id,
                    ];
                } else {
                    throw new \InvalidArgumentException("Unsupported offline operation type '{$opType}'.");
                }

                DB::commit();
            } catch (\Throwable $e) {
                DB::rollBack();

                SyncTransaction::create([
                    'idempotency_key' => $idempotencyKey,
                    'branch_id' => $branchId,
                    'user_id' => $user?->id,
                    'operation_type' => $opType,
                    'entity_type' => 'unknown',
                    'entity_id' => null,
                    'payload' => $payload,
                    'status' => 'failed',
                    'resolution_notes' => $e->getMessage(),
                    'synced_at' => now(),
                ]);

                $failed[] = [
                    'idempotency_key' => $idempotencyKey,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $this->successResponse([
            'processed_count' => count($processed),
            'failed_count' => count($failed),
            'processed' => $processed,
            'failed' => $failed,
        ], 'Offline synchronization batch processed.');
    }
}

