<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'idempotency_key',
        'branch_id',
        'user_id',
        'operation_type',
        'entity_type',
        'entity_id',
        'payload',
        'status',
        'resolution_notes',
        'client_timestamp',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'client_timestamp' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

