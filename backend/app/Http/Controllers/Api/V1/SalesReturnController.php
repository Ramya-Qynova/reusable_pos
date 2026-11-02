<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CreditNote;
use App\Services\Sales\SalesReturnService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SalesReturnController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected SalesReturnService $returnService
    ) {}

    /**
     * List sales returns for active branch
     */
    public function index(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $filters = $request->only(['search', 'customer_id', 'status', 'from_date', 'to_date']);
        $perPage = (int) $request->input('per_page', 15);

        $returns = $this->returnService->getReturns($branch->id, $filters, $perPage);

        return $this->paginatedResponse($returns, 'Sales returns retrieved successfully.');
    }

    /**
     * Create / record sales return
     */
    public function store(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $user = $request->user();

        $validated = $request->validate([
            'sales_order_id' => ['nullable', 'integer', 'exists:sales_orders,id'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'return_date' => ['nullable', 'date'],
            'refund_method' => ['required', 'string', 'in:cash,card,upi,credit_note,customer_balance'],
            'reason' => ['nullable', 'string', 'max:191'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.sales_order_item_id' => ['nullable', 'integer'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0'],
            'items.*.restock' => ['nullable', 'boolean'],
            'items.*.condition' => ['nullable', 'string', 'in:good,damaged,defective'],
        ]);

        $salesReturn = $this->returnService->createReturn($validated, $user, $branch);

        return $this->successResponse($salesReturn, 'Sales return recorded successfully.', Response::HTTP_CREATED);
    }

    /**
     * View sales return details
     */
    public function show(int $id): JsonResponse
    {
        $branch = app('active_branch');
        $return = $this->returnService->getReturnById($id, $branch->id);

        return $this->successResponse($return, 'Sales return details retrieved successfully.');
    }

    /**
     * List customer credit notes for active branch
     */
    public function creditNotes(Request $request): JsonResponse
    {
        $branch = app('active_branch');
        $filters = $request->only(['search', 'customer_id', 'status']);
        $perPage = (int) $request->input('per_page', 15);

        $notes = $this->returnService->getCreditNotes($branch->id, $filters, $perPage);

        return $this->paginatedResponse($notes, 'Credit notes retrieved successfully.');
    }

    /**
     * Redeem credit note against counter sale
     */
    public function redeemCreditNote(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'sales_order_id' => ['nullable', 'integer', 'exists:sales_orders,id'],
        ]);

        $branch = app('active_branch');
        $creditNote = CreditNote::where('id', $id)->where('branch_id', $branch->id)->firstOrFail();

        $redeemed = $this->returnService->redeemCreditNote(
            $creditNote,
            (float) $request->input('amount'),
            $request->input('sales_order_id'),
            $request->user()
        );

        return $this->successResponse($redeemed, 'Credit note redeemed successfully.');
    }
}
