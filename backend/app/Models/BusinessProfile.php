<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_name',
        'legal_name',
        'tax_id',
        'currency_code',
        'currency_symbol',
        'timezone',
        'active_vertical',
        'email',
        'phone',
        'address',
    ];
}

