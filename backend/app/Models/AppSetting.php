<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'group',
        'key',
        'value',
        'type',
        'description',
    ];

    /**
     * Get setting value by key, with optional fallback
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (!$setting) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $setting->value,
            'json' => json_decode($setting->value, true),
            default => $setting->value,
        };
    }

    /**
     * Set setting value by key
     */
    public static function set(string $key, mixed $value, string $group = 'general', ?string $type = null, ?string $description = null): self
    {
        if ($type === null) {
            $type = match (gettype($value)) {
                'boolean' => 'boolean',
                'integer' => 'integer',
                'array' => 'json',
                default => 'string',
            };
        }

        $val = match ($type) {
            'boolean' => $value ? '1' : '0',
            'json' => json_encode($value),
            default => (string) $value,
        };

        return static::updateOrCreate(
            ['key' => $key],
            [
                'group' => $group,
                'value' => $val,
                'type' => $type,
                'description' => $description,
            ]
        );
    }
}

