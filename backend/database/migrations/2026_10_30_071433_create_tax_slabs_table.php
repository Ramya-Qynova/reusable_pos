<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_slabs', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50); // e.g. "GST 5%", "GST 18%"
            $table->decimal('rate', 5, 2); // e.g. 5.00, 18.00
            $table->decimal('cgst_rate', 5, 2)->default(0.00); // 2.50
            $table->decimal('sgst_rate', 5, 2)->default(0.00); // 2.50
            $table->decimal('igst_rate', 5, 2)->default(0.00); // 5.00
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_slabs');
    }
};

