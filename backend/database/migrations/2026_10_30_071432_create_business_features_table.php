<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_features', function (Blueprint $table) {
            $table->id();
            $table->string('feature_key', 60)->unique();
            $table->boolean('is_enabled')->default(false);
            $table->json('config_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_features');
    }
};

