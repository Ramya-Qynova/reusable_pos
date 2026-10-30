<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessFeature extends Model
{
    use HasFactory;

    protected $fillable = [
        'feature_key',
        'is_enabled',
        'config_payload',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'config_payload' => 'array',
        ];
    }
}

