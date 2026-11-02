<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Sales Returns Header Table
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number', 50)->unique();
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('cash_register_shift_id')->nullable()->constrained('cash_register_shifts')->nullOnDelete();
            $table->date('return_date')->index();
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2)->default(0.00); // Net refund or credit amount
            $table->string('refund_method', 30)->default('cash'); // cash, upi, card, credit_note, customer_balance
            $table->string('status', 20)->default('completed')->index(); // completed, cancelled
            $table->string('reason', 191)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['branch_id', 'return_date']);
            $table->index(['sales_order_id', 'status']);
        });

        // 2. Sales Return Items
        Schema::create('sales_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->cascadeOnDelete();
            $table->foreignId('sales_order_item_id')->nullable()->constrained('sales_order_items')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('tax_rate', 5, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2);
            $table->boolean('restock')->default(true); // whether to put back into salable inventory
            $table->string('condition', 30)->default('good'); // good, damaged, defective
            $table->timestamps();

            $table->index(['sales_return_id', 'product_id']);
        });

        // 3. Customer Credit Notes
        Schema::create('credit_notes', function (Blueprint $table) {
            $table->id();
            $table->string('credit_note_number', 50)->unique();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->foreignId('sales_return_id')->nullable()->constrained('sales_returns')->nullOnDelete();
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->date('issue_date')->index();
            $table->decimal('amount', 12, 2);
            $table->decimal('used_amount', 12, 2)->default(0.00);
            $table->decimal('balance_amount', 12, 2);
            $table->string('status', 20)->default('active')->index(); // active, partially_used, redeemed, expired, cancelled
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_notes');
        Schema::dropIfExists('sales_return_items');
        Schema::dropIfExists('sales_returns');
    }
};
