<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Branch Stock Balances
        Schema::create('branch_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->unsignedBigInteger('variant_key')->storedAs('COALESCE(variant_id, 0)');
            $table->decimal('quantity', 12, 3)->default(0.000);
            $table->decimal('damaged_quantity', 12, 3)->default(0.000);
            $table->decimal('reserved_quantity', 12, 3)->default(0.000);
            $table->timestamps();

            $table->unique(['branch_id', 'product_id', 'variant_key'], 'branch_prod_var_unique');
            $table->index(['branch_id', 'product_id']);
        });

        // 2. Stock Batches & Expiry Management
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->string('batch_number', 60);
            $table->date('manufacturing_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('quantity', 12, 3)->default(0.000);
            $table->decimal('cost_price', 12, 2)->default(0.00);
            $table->decimal('selling_price', 12, 2)->default(0.00);
            $table->enum('status', ['active', 'expired', 'depleted'])->default('active');
            $table->timestamps();

            $table->index(['branch_id', 'product_id']);
            $table->index(['batch_number']);
            $table->index(['expiry_date']);
        });

        // 3. Stock Movements (Comprehensive Audit Ledger)
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->string('movement_type', 40); // purchase_receipt, sale, adjustment_in, adjustment_out, transfer_in, transfer_out, damage, return
            $table->decimal('quantity', 12, 3); // positive for increase, negative for deduction
            $table->decimal('previous_quantity', 12, 3)->default(0.000);
            $table->decimal('new_quantity', 12, 3)->default(0.000);
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->string('reference_type', 60)->nullable(); // sales_order, purchase_order, goods_receipt, stock_adjustment, stock_transfer
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reason', 191)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['branch_id', 'product_id']);
            $table->index(['movement_type']);
            $table->index(['created_at']);
        });

        // 4. Stock Adjustments Master
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->string('adjustment_number', 50)->unique();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('reason', 100); // count_mismatch, damaged, expired, theft, write_off, initial_stock, other
            $table->enum('type', ['addition', 'subtraction', 'damage', 'physical_count'])->default('addition');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('branch_id');
            $table->index('created_at');
        });

        // 5. Stock Adjustment Line Items
        Schema::create('stock_adjustment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_adjustment_id')->constrained('stock_adjustments')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->decimal('quantity_adjusted', 12, 3); // positive or negative
            $table->decimal('unit_cost', 12, 2)->default(0.00);
            $table->timestamps();
        });

        // 6. Stock Transfers
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_number', 50)->unique();
            $table->foreignId('source_branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('destination_branch_id')->constrained('branches')->restrictOnDelete();
            $table->enum('status', ['draft', 'dispatched', 'received', 'cancelled'])->default('draft');
            $table->dateTime('dispatch_date')->nullable();
            $table->dateTime('receive_date')->nullable();
            $table->foreignId('dispatched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('source_branch_id');
            $table->index('destination_branch_id');
            $table->index('status');
        });

        // 7. Stock Transfer Line Items
        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')->constrained('stock_transfers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->decimal('quantity_sent', 12, 3);
            $table->decimal('quantity_received', 12, 3)->default(0.000);
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_items');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('stock_adjustment_items');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stock_batches');
        Schema::dropIfExists('branch_stocks');
    }
};

