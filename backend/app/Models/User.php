<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'pin_code',
        'is_super_admin',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'pin_code',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'pin_code' => 'hashed',
            'is_super_admin' => 'boolean',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function branchRoles(): HasMany
    {
        return $this->hasMany(UserBranchRole::class);
    }

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'user_branch_roles')
            ->withPivot('role_id')
            ->withTimestamps()
            ->distinct();
    }

    public function canAccessBranch(int|string $branchId): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        return $this->branchRoles()->where('branch_id', $branchId)->exists();
    }

    public function getRoleInBranch(int|string $branchId): ?Role
    {
        $assignment = $this->branchRoles()->where('branch_id', $branchId)->with('role')->first();
        return $assignment?->role;
    }

    public function hasPermissionInBranch(string $permissionSlug, int|string $branchId): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        $roles = $this->branchRoles()
            ->where('branch_id', $branchId)
            ->with('role.permissions')
            ->get()
            ->pluck('role');

        foreach ($roles as $role) {
            if ($role && $role->permissions->contains('slug', $permissionSlug)) {
                return true;
            }
        }

        return false;
    }

    public function hasPermission(string $permissionSlug, int|string|null $branchId = null): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        if ($branchId) {
            return $this->hasPermissionInBranch($permissionSlug, $branchId);
        }

        $roles = $this->branchRoles()
            ->with('role.permissions')
            ->get()
            ->pluck('role');

        foreach ($roles as $role) {
            if ($role && $role->permissions->contains('slug', $permissionSlug)) {
                return true;
            }
        }

        return false;
    }
}
