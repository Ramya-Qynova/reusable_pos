<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_code',
        'name',
        'location',
        'address',
        'phone',
        'email',
        'is_main_branch',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_main_branch' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function userBranchRoles(): HasMany
    {
        return $this->hasMany(UserBranchRole::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_branch_roles')
            ->withPivot('role_id')
            ->withTimestamps()
            ->distinct();
    }
}

