<?php

namespace App\Providers;

use App\Services\Inventory\StockServiceBridge;
use App\Services\Inventory\StockServiceInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(StockServiceInterface::class, StockServiceBridge::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
