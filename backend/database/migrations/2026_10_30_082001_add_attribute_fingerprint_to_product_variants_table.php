<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('attribute_fingerprint', 64)->nullable()->after('attributes_json');
            $table->unique(['product_id', 'attribute_fingerprint'], 'uq_product_variant_attributes');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique('uq_product_variant_attributes');
            $table->dropColumn('attribute_fingerprint');
        });
    }
};

