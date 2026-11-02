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
        Schema::create('sales_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cash_register_shift_id')->nullable()->constrained('cash_register_shifts')->nullOnDelete();
            $table->string('payment_method', 30); // cash, upi, card, other
            $table->decimal('amount', 12, 2);
            $table->string('payment_reference', 100)->nullable();
            $table->string('status', 20)->default('successful'); // successful, failed, refunded
            $table->dateTime('payment_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['sales_order_id', 'status']);
            $table->index(['branch_id', 'payment_method']);
            $table->index(['cash_register_shift_id', 'payment_method']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_payments');
    }
};
