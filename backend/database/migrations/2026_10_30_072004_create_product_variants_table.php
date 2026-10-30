<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('variant_sku', 60)->unique();
            $table->string('variant_barcode', 60)->unique()->nullable();
            $table->json('attributes_json'); // e.g. {"size": "XL", "color": "Navy Blue"}
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->decimal('selling_price', 12, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['product_id', 'is_active']);
            $table->index('variant_barcode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};

