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
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('cash_register_shift_id')->nullable()->constrained('cash_register_shifts')->nullOnDelete();
            $table->string('invoice_number', 50)->unique();
            $table->dateTime('order_date')->index();
            $table->string('status', 20)->default('completed')->index(); // completed, pending, cancelled
            $table->string('payment_status', 20)->default('paid')->index(); // paid, partial, unpaid
            $table->boolean('is_gst_bill')->default(true);
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->string('discount_type', 20)->nullable(); // fixed, percentage
            $table->decimal('discount_rate', 5, 2)->nullable();
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('cgst_amount', 12, 2)->default(0.00);
            $table->decimal('sgst_amount', 12, 2)->default(0.00);
            $table->decimal('igst_amount', 12, 2)->default(0.00);
            $table->decimal('round_off', 8, 2)->default(0.00);
            $table->decimal('grand_total', 12, 2)->default(0.00);
            $table->decimal('paid_amount', 12, 2)->default(0.00);
            $table->decimal('change_amount', 12, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['branch_id', 'order_date']);
            $table->index(['branch_id', 'status']);
        });

        Schema::create('sales_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();
            $table->string('product_name');
            $table->string('variant_name')->nullable();
            $table->string('sku', 100)->nullable();
            $table->string('barcode', 100)->nullable();
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_price', 12, 2);
            $table->string('discount_type', 20)->nullable(); // fixed, percentage
            $table->decimal('discount_rate', 5, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->foreignId('tax_slab_id')->nullable()->constrained('tax_slabs')->nullOnDelete();
            $table->decimal('tax_rate', 5, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('cgst_amount', 12, 2)->default(0.00);
            $table->decimal('sgst_amount', 12, 2)->default(0.00);
            $table->decimal('igst_amount', 12, 2)->default(0.00);
            $table->boolean('is_tax_inclusive')->default(false);
            $table->decimal('subtotal', 12, 2); // taxable base
            $table->decimal('total', 12, 2); // net line total
            $table->timestamps();

            $table->index(['sales_order_id', 'product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_order_items');
        Schema::dropIfExists('sales_orders');
    }
};
