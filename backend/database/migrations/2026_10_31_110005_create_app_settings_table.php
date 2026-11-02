<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Dynamic Key-Value App Settings Table
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('group', 50); // general, invoice, payment, printer, barcode, notification, sync
            $table->string('key', 100)->unique();
            $table->longText('value')->nullable();
            $table->string('type', 30)->default('string'); // string, boolean, integer, json
            $table->string('description', 255)->nullable();
            $table->timestamps();

            $table->index('group');
        });

        // 2. Offline Synchronization Log / Idempotency Table
        Schema::create('sync_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('idempotency_key', 100)->unique();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('operation_type', 50); // offline_sale, stock_adjustment, customer_create
            $table->string('entity_type', 50);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('payload')->nullable();
            $table->enum('status', ['success', 'conflict', 'failed'])->default('success');
            $table->text('resolution_notes')->nullable();
            $table->timestamp('client_timestamp')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->timestamps();

            $table->index(['branch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_transactions');
        Schema::dropIfExists('app_settings');
    }
};

