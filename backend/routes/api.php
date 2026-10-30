<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BranchController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\UnitController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - V1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Public authentication endpoint
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Public/bootstrap business profile endpoint (for initial client branding before login)
    Route::get('/settings/profile', [SettingsController::class, 'profile']);
    Route::get('/settings/features', [SettingsController::class, 'features']);

    // Authenticated API routes
    Route::middleware('auth:sanctum')->group(function () {
        // Auth session
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Branches
        Route::get('/branches', [BranchController::class, 'index']);

        // Tax slabs
        Route::get('/settings/tax-slabs', [SettingsController::class, 'taxSlabs']);

        // Categories (Catalog reading)
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/categories/{category}', [CategoryController::class, 'show']);

        // Units of Measurement (Reading)
        Route::get('/units', [UnitController::class, 'index']);
        Route::get('/units/{unit}', [UnitController::class, 'show']);

        // Products, Variants & Barcode (Catalog reading & POS lookup)
        Route::get('/products/meta', [ProductController::class, 'meta']);
        Route::get('/products', [ProductController::class, 'index']);
        Route::get('/products/barcode/{barcode}', [ProductController::class, 'barcodeLookup']);
        Route::get('/products/{product}', [ProductController::class, 'show']);

        // Customers Master (Reading)
        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/customers/next-code', [CustomerController::class, 'nextCode']);
        Route::get('/customers/{customer}', [CustomerController::class, 'show']);

        // Suppliers Master (Reading)
        Route::get('/suppliers', [SupplierController::class, 'index']);
        Route::get('/suppliers/next-code', [SupplierController::class, 'nextCode']);
        Route::get('/suppliers/{supplier}', [SupplierController::class, 'show']);

        // Mutating Catalog Operations (Guarded by catalog.manage permission)
        Route::middleware('permission:catalog.manage')->group(function () {
            // Category mutations
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::match(['put', 'patch'], '/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

            // Unit mutations
            Route::post('/units', [UnitController::class, 'store']);
            Route::match(['put', 'patch'], '/units/{unit}', [UnitController::class, 'update']);
            Route::delete('/units/{unit}', [UnitController::class, 'destroy']);

            // Product mutations & branch pricing
            Route::post('/products', [ProductController::class, 'store']);
            Route::match(['put', 'patch'], '/products/{product}', [ProductController::class, 'update']);
            Route::delete('/products/{product}', [ProductController::class, 'destroy']);
            Route::post('/products/{product}/branch-price', [ProductController::class, 'setBranchPrice']);
        });

        // Mutating Customers Operations (Guarded by customers.manage permission)
        Route::middleware('permission:customers.manage')->group(function () {
            Route::post('/customers', [CustomerController::class, 'store']);
            Route::match(['put', 'patch'], '/customers/{customer}', [CustomerController::class, 'update']);
            Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);
            Route::post('/customers/{customer}/toggle-status', [CustomerController::class, 'toggleStatus']);
        });

        // Mutating Suppliers Operations (Guarded by suppliers.manage permission)
        Route::middleware('permission:suppliers.manage')->group(function () {
            Route::post('/suppliers', [SupplierController::class, 'store']);
            Route::match(['put', 'patch'], '/suppliers/{supplier}', [SupplierController::class, 'update']);
            Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);
            Route::post('/suppliers/{supplier}/toggle-status', [SupplierController::class, 'toggleStatus']);
        });

        // Operational routes requiring validated active branch context
        Route::middleware('branch.access')->group(function () {
            Route::get('/branches/current', [BranchController::class, 'current']);
        });
    });
});
