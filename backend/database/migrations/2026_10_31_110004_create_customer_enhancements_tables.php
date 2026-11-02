<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Customer Groups Table
        Schema::create('customer_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 50)->unique();
            $table->decimal('discount_percentage', 5, 2)->default(0.00);
            $table->decimal('credit_limit', 12, 2)->default(0.00);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('code');
            $table->index('is_active');
        });

        // 2. Enhance Customers Table
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'customer_group_id')) {
                $table->foreignId('customer_group_id')->nullable()->after('customer_code')->constrained('customer_groups')->nullOnDelete();
            }
            if (!Schema::hasColumn('customers', 'customer_type')) {
                $table->string('customer_type', 30)->default('retail')->after('customer_group_id'); // retail, wholesale, vip, corporate
            }
            if (!Schema::hasColumn('customers', 'credit_limit')) {
                $table->decimal('credit_limit', 12, 2)->default(0.00)->after('tax_number');
            }
            if (!Schema::hasColumn('customers', 'opening_balance')) {
                $table->decimal('opening_balance', 12, 2)->default(0.00)->after('credit_limit');
            }
            if (!Schema::hasColumn('customers', 'current_balance')) {
                $table->decimal('current_balance', 12, 2)->default(0.00)->after('opening_balance'); // Receivable amount
            }
            if (!Schema::hasColumn('customers', 'loyalty_points')) {
                $table->integer('loyalty_points')->default(0)->after('current_balance');
            }
        });

        // 3. Customer Ledger
        Schema::create('customer_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->enum('transaction_type', ['opening_balance', 'sale', 'payment', 'return', 'credit_adjustment']);
            $table->string('reference_type', 60)->nullable(); // sales_order, credit_payment, sales_return
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->date('transaction_date');
            $table->decimal('debit', 14, 2)->default(0.00); // Sale / increase receivable
            $table->decimal('credit', 14, 2)->default(0.00); // Payment / return / decrease receivable
            $table->decimal('running_balance', 14, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('customer_id');
            $table->index('transaction_date');
        });

        // 4. Customer Loyalty Transactions
        Schema::create('customer_loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->enum('type', ['earned', 'redeemed', 'expired', 'adjustment'])->default('earned');
            $table->integer('points');
            $table->decimal('conversion_amount', 10, 2)->default(0.00);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_loyalty_transactions');
        Schema::dropIfExists('customer_ledgers');

        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'customer_group_id')) {
                $table->dropForeign(['customer_group_id']);
                $table->dropColumn('customer_group_id');
            }
            if (Schema::hasColumn('customers', 'customer_type')) {
                $table->dropColumn('customer_type');
            }
            if (Schema::hasColumn('customers', 'credit_limit')) {
                $table->dropColumn('credit_limit');
            }
            if (Schema::hasColumn('customers', 'opening_balance')) {
                $table->dropColumn('opening_balance');
            }
            if (Schema::hasColumn('customers', 'current_balance')) {
                $table->dropColumn('current_balance');
            }
            if (Schema::hasColumn('customers', 'loyalty_points')) {
                $table->dropColumn('loyalty_points');
            }
        });

        Schema::dropIfExists('customer_groups');
    }
};

