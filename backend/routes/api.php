<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BranchController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CashRegisterController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\PurchaseController;
use App\Http\Controllers\Api\V1\SaleController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\SyncController;
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

    // Offline / Sync status check
    Route::get('/sync/status', [SyncController::class, 'status']);

    // Authenticated API routes
    Route::middleware('auth:sanctum')->group(function () {
        // Auth session
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Branches
        Route::get('/branches', [BranchController::class, 'index']);

        // Settings
        Route::get('/settings/all', [SettingsController::class, 'allSettings']);
        Route::post('/settings', [SettingsController::class, 'updateSettings']);
        Route::put('/settings/profile', [SettingsController::class, 'updateProfile']);
        Route::put('/settings/features', [SettingsController::class, 'updateFeatures']);
        Route::get('/settings/tax-slabs', [SettingsController::class, 'taxSlabs']);
        Route::post('/settings/tax-slabs', [SettingsController::class, 'storeTaxSlab']);
        Route::get('/settings/users', [SettingsController::class, 'users']);
        Route::post('/settings/users', [SettingsController::class, 'storeUser']);
        Route::get('/settings/roles', [SettingsController::class, 'roles']);
        Route::post('/settings/roles/{role}/permissions', [SettingsController::class, 'updateRolePermissions']);
        Route::get('/settings/health', [SettingsController::class, 'systemHealth']);

        // Brands
        Route::get('/brands', [BrandController::class, 'index']);
        Route::get('/brands/{brand}', [BrandController::class, 'show']);
        Route::post('/brands', [BrandController::class, 'store']);
        Route::match(['put', 'patch'], '/brands/{brand}', [BrandController::class, 'update']);
        Route::delete('/brands/{brand}', [BrandController::class, 'destroy']);

        // Categories (Catalog reading)
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/categories/{category}', [CategoryController::class, 'show']);

        // Units of Measurement (Reading)
        Route::get('/units', [UnitController::class, 'index']);
        Route::get('/units/{unit}', [UnitController::class, 'show']);

        // Products, Variants & Barcode (Catalog reading & POS lookup)
        Route::get('/products/meta', [ProductController::class, 'meta']);
        Route::get('/products/dashboard-stats', [ProductController::class, 'dashboardStats']);
        Route::get('/products/export', [ProductController::class, 'bulkExport']);
        Route::post('/products/generate-barcode', [ProductController::class, 'generateBarcode']);
        Route::post('/products/import', [ProductController::class, 'bulkImport']);
        Route::get('/products', [ProductController::class, 'index']);
        Route::get('/products/barcode/{barcode}', [ProductController::class, 'barcodeLookup']);
        Route::get('/products/{product}', [ProductController::class, 'show']);

        // Customers Master (Reading & Actions)
        Route::get('/customers/dashboard-stats', [CustomerController::class, 'dashboardStats']);
        Route::get('/customers/groups', [CustomerController::class, 'groups']);
        Route::post('/customers/groups', [CustomerController::class, 'storeGroup']);
        Route::match(['put', 'patch'], '/customers/groups/{group}', [CustomerController::class, 'updateGroup']);
        Route::delete('/customers/groups/{group}', [CustomerController::class, 'destroyGroup']);
        Route::get('/customers/export', [CustomerController::class, 'bulkExport']);
        Route::post('/customers/import', [CustomerController::class, 'bulkImport']);
        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/customers/next-code', [CustomerController::class, 'nextCode']);
        Route::get('/customers/{customer}', [CustomerController::class, 'show']);
        Route::post('/customers/{customer}/credit-payment', [CustomerController::class, 'recordCreditPayment']);

        // Suppliers Master (Reading)
        Route::get('/suppliers', [SupplierController::class, 'index']);
        Route::get('/suppliers/next-code', [SupplierController::class, 'nextCode']);
        Route::get('/suppliers/{supplier}', [SupplierController::class, 'show']);

        // Inventory Management
        Route::get('/inventory/dashboard-stats', [InventoryController::class, 'dashboardStats']);
        Route::get('/inventory/overview', [InventoryController::class, 'overview']);
        Route::get('/inventory/stocks', [InventoryController::class, 'index']);
        Route::post('/inventory/stock-in', [InventoryController::class, 'stockIn']);
        Route::post('/inventory/stock-out', [InventoryController::class, 'stockOut']);
        Route::post('/inventory/adjust', [InventoryController::class, 'adjust']);
        Route::get('/inventory/transfers', [InventoryController::class, 'transfers']);
        Route::post('/inventory/transfers', [InventoryController::class, 'createTransfer']);
        Route::post('/inventory/transfers/{transfer}/receive', [InventoryController::class, 'receiveTransfer']);
        Route::get('/inventory/movements', [InventoryController::class, 'movements']);
        Route::get('/inventory/valuation', [InventoryController::class, 'valuation']);
        Route::get('/inventory/batches', [InventoryController::class, 'batches']);
        Route::post('/inventory/batches', [InventoryController::class, 'storeBatch']);

        // Purchase Management
        Route::get('/purchases/dashboard-stats', [PurchaseController::class, 'dashboardStats']);
        Route::get('/purchases/orders', [PurchaseController::class, 'indexOrders']);
        Route::post('/purchases/orders', [PurchaseController::class, 'storeOrder']);
        Route::get('/purchases/orders/{order}', [PurchaseController::class, 'showOrder']);
        Route::get('/purchases/goods-receipts', [PurchaseController::class, 'goodsReceipts']);
        Route::post('/purchases/goods-receipts', [PurchaseController::class, 'storeGoodsReceipt']);
        Route::get('/purchases/invoices', [PurchaseController::class, 'invoices']);
        Route::get('/purchases/payments', [PurchaseController::class, 'payments']);
        Route::post('/purchases/payments', [PurchaseController::class, 'storePayment']);
        Route::get('/purchases/returns', [PurchaseController::class, 'returns']);
        Route::post('/purchases/returns', [PurchaseController::class, 'storeReturn']);
        Route::get('/purchases/supplier-ledger/{supplierId}', [PurchaseController::class, 'supplierLedger']);

        // Offline Data Synchronization
        Route::get('/sync/pull', [SyncController::class, 'pull']);
        Route::post('/sync/push', [SyncController::class, 'push']);

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

            // POS Billing & Sales (Guarded by pos.billing permission)
            Route::middleware('permission:pos.billing')->group(function () {
                Route::get('/sales', [SaleController::class, 'index']);
                Route::post('/sales', [SaleController::class, 'store']);
                Route::get('/sales/summary', [SaleController::class, 'summary']);
                Route::get('/sales/{id}', [SaleController::class, 'show']);
            });

            // Cash Drawer Management (Guarded by cash.drawer permission)
            Route::middleware('permission:cash.drawer')->group(function () {
                Route::get('/cash-register/current', [CashRegisterController::class, 'current']);
                Route::post('/cash-register/open', [CashRegisterController::class, 'open']);
                Route::post('/cash-register/close', [CashRegisterController::class, 'close']);
                Route::post('/cash-register/movement', [CashRegisterController::class, 'recordMovement']);
                Route::get('/cash-register/shifts', [CashRegisterController::class, 'shifts']);
            });
        });
    });
});
