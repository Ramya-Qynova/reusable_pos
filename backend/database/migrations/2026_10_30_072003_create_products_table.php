<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->foreignId('tax_slab_id')->nullable()->constrained('tax_slabs')->nullOnDelete();
            $table->string('name', 191);
            $table->string('sku', 60)->unique();
            $table->string('barcode', 60)->unique()->nullable();
            $table->string('hsn_code', 20)->nullable();
            $table->decimal('tax_rate', 5, 2)->default(0.00);
            $table->boolean('is_tax_inclusive')->default(true);
            $table->decimal('cost_price', 12, 2)->default(0.00);
            $table->decimal('selling_price', 12, 2);
            $table->decimal('minimum_stock', 10, 3)->default(5.000);
            $table->boolean('has_variants')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('name');
            $table->index('category_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

