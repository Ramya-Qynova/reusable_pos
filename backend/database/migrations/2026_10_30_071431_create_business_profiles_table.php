<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('business_name', 191);
            $table->string('legal_name', 191)->nullable();
            $table->string('tax_id', 50)->nullable(); // GSTIN
            $table->string('currency_code', 10)->default('INR');
            $table->string('currency_symbol', 10)->default('₹');
            $table->string('timezone', 50)->default('Asia/Kolkata');
            $table->string('active_vertical', 50)->default('supermarket');
            $table->string('email', 100)->nullable();
            $table->string('phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_profiles');
    }
};

