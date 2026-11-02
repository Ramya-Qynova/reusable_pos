<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Brand;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerLedger;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use Illuminate\Database\Seeder;

class ModuleEnhancementsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Brands
        $brandsData = [
            ['name' => 'Fresh Farms', 'code' => 'BR-FF', 'description' => 'Fresh farm produce and daily essentials'],
            ['name' => 'Organic Valley', 'code' => 'BR-OV', 'description' => 'Certified organic pulses and grains'],
            ['name' => 'Heritage Dairy', 'code' => 'BR-HD', 'description' => 'Pure milk and dairy products'],
            ['name' => 'Golden Harvest', 'code' => 'BR-GH', 'description' => 'Flours, rice and edible oils'],
            ['name' => 'GreenMart Select', 'code' => 'BR-GMS', 'description' => 'House brand packaged commodities'],
        ];

        $brands = [];
        foreach ($brandsData as $b) {
            $brands[] = Brand::updateOrCreate(['code' => $b['code']], $b);
        }

        // Assign brands to existing products
        $allProducts = Product::all();
        foreach ($allProducts as $idx => $prod) {
            $assignedBrand = $brands[$idx % count($brands)];
            $prod->update([
                'brand_id' => $assignedBrand->id,
                'mrp' => round($prod->selling_price * 1.15, 2),
                'description' => "High quality {$prod->name} stocked fresh daily.",
            ]);
        }

        // 2. Customer Groups
        $groupsData = [
            ['name' => 'Regular Retail', 'code' => 'RETAIL', 'discount_percentage' => 0.00, 'credit_limit' => 5000.00, 'description' => 'Standard walk-in retail customers'],
            ['name' => 'Wholesale Tier 1', 'code' => 'WHOLESALE', 'discount_percentage' => 5.00, 'credit_limit' => 50000.00, 'description' => 'Bulk commercial buyers'],
            ['name' => 'VIP Members', 'code' => 'VIP', 'discount_percentage' => 3.00, 'credit_limit' => 20000.00, 'description' => 'Enrolled loyalty card members'],
            ['name' => 'Corporate Accounts', 'code' => 'CORP', 'discount_percentage' => 7.50, 'credit_limit' => 100000.00, 'description' => 'Corporate and institutional clients'],
        ];

        $groups = [];
        foreach ($groupsData as $g) {
            $groups[] = CustomerGroup::updateOrCreate(['code' => $g['code']], $g);
        }

        // Assign customer groups and opening balances
        $customers = Customer::all();
        foreach ($customers as $idx => $cust) {
            $grp = $groups[$idx % count($groups)];
            $cust->update([
                'customer_group_id' => $grp->id,
                'customer_type' => strtolower($grp->code),
                'credit_limit' => $grp->credit_limit,
                'opening_balance' => $idx === 1 ? 1250.00 : 0.00,
                'current_balance' => $idx === 1 ? 1250.00 : 0.00,
                'loyalty_points' => 150 * ($idx + 1),
            ]);

            if ($idx === 1 && !CustomerLedger::where('customer_id', $cust->id)->exists()) {
                CustomerLedger::create([
                    'customer_id' => $cust->id,
                    'branch_id' => 1,
                    'transaction_type' => 'opening_balance',
                    'reference_type' => 'opening',
                    'transaction_date' => now()->subDays(30),
                    'debit' => 1250.00,
                    'credit' => 0.00,
                    'running_balance' => 1250.00,
                    'notes' => 'Opening credit balance brought forward',
                ]);
            }
        }

        // 3. Initial Stock for Branches
        $branches = Branch::all();
        foreach ($branches as $branch) {
            foreach ($allProducts as $idx => $prod) {
                // Vary quantities: some high, some low, some out of stock for testing
                $qty = match ($idx % 5) {
                    0 => 45.000,
                    1 => 3.000,  // Low stock
                    2 => 0.000,  // Out of stock
                    3 => 120.000,
                    default => 25.000,
                };
                $damaged = ($idx === 0) ? 2.000 : 0.000;

                $stock = BranchStock::updateOrCreate(
                    [
                        'branch_id' => $branch->id,
                        'product_id' => $prod->id,
                        'variant_id' => null,
                    ],
                    [
                        'quantity' => $qty,
                        'damaged_quantity' => $damaged,
                        'reserved_quantity' => 0.000,
                    ]
                );

                if ($qty > 0 && !StockMovement::where('branch_id', $branch->id)->where('product_id', $prod->id)->exists()) {
                    StockMovement::create([
                        'branch_id' => $branch->id,
                        'product_id' => $prod->id,
                        'movement_type' => 'initial',
                        'quantity' => $qty,
                        'previous_quantity' => 0.000,
                        'new_quantity' => $qty,
                        'unit_cost' => $prod->cost_price,
                        'reference_type' => 'opening_stock',
                        'reason' => 'Store initial inventory setup',
                        'user_id' => 1,
                        'created_at' => now()->subDays(15),
                    ]);
                }
            }
        }

        // 4. Initial Supplier Ledgers
        $suppliers = Supplier::all();
        foreach ($suppliers as $idx => $supp) {
            if (!SupplierLedger::where('supplier_id', $supp->id)->exists()) {
                $openingPayable = ($idx === 0) ? 14500.00 : 0.00;
                SupplierLedger::create([
                    'supplier_id' => $supp->id,
                    'branch_id' => 1,
                    'transaction_type' => 'opening_balance',
                    'transaction_date' => now()->subDays(45),
                    'debit' => 0.00,
                    'credit' => $openingPayable,
                    'running_balance' => $openingPayable,
                    'description' => 'Opening vendor payable balance',
                ]);
            }
        }

        // 5. Default Application Settings
        $defaultSettings = [
            // General
            ['group' => 'general', 'key' => 'store_name', 'value' => 'Green Mart Supermarket', 'type' => 'string', 'description' => 'Display name of store'],
            ['group' => 'general', 'key' => 'timezone', 'value' => 'Asia/Kolkata', 'type' => 'string', 'description' => 'Store primary timezone'],
            ['group' => 'general', 'key' => 'date_format', 'value' => 'DD/MM/YYYY', 'type' => 'string', 'description' => 'Display date format'],
            ['group' => 'general', 'key' => 'allow_negative_stock', 'value' => '0', 'type' => 'boolean', 'description' => 'Allow selling when stock is zero'],
            
            // Currency
            ['group' => 'currency', 'key' => 'currency_symbol', 'value' => '₹', 'type' => 'string', 'description' => 'Primary currency symbol'],
            ['group' => 'currency', 'key' => 'currency_code', 'value' => 'INR', 'type' => 'string', 'description' => 'Primary ISO currency code'],
            ['group' => 'currency', 'key' => 'decimal_places', 'value' => '2', 'type' => 'integer', 'description' => 'Number of decimal positions'],
            
            // Invoice
            ['group' => 'invoice', 'key' => 'invoice_prefix', 'value' => 'INV', 'type' => 'string', 'description' => 'Sales invoice prefix'],
            ['group' => 'invoice', 'key' => 'header_note', 'value' => 'Thank you for shopping with Green Mart!', 'type' => 'string', 'description' => 'Printed at top of invoice'],
            ['group' => 'invoice', 'key' => 'footer_note', 'value' => 'Goods once sold cannot be returned without original receipt. Terms apply.', 'type' => 'string', 'description' => 'Printed at bottom of invoice'],
            ['group' => 'invoice', 'key' => 'show_qr_code', 'value' => '1', 'type' => 'boolean', 'description' => 'Print UPI/GST QR code on receipt'],
            ['group' => 'invoice', 'key' => 'print_thermal_copies', 'value' => '1', 'type' => 'integer', 'description' => 'Default receipt print copies'],

            // Printer
            ['group' => 'printer', 'key' => 'printer_type', 'value' => 'thermal_80mm', 'type' => 'string', 'description' => 'Printer type (thermal_80mm, thermal_58mm, laser_a4)'],
            ['group' => 'printer', 'key' => 'auto_cut_paper', 'value' => '1', 'type' => 'boolean', 'description' => 'Send cut command after print'],
            ['group' => 'printer', 'key' => 'open_drawer_on_sale', 'value' => '1', 'type' => 'boolean', 'description' => 'Pulse cash drawer open on cash checkout'],

            // Barcode
            ['group' => 'barcode', 'key' => 'symbology', 'value' => 'CODE128', 'type' => 'string', 'description' => 'Default barcode generation symbology'],
            ['group' => 'barcode', 'key' => 'barcode_prefix', 'value' => 'GM', 'type' => 'string', 'description' => 'Prefix for auto-generated barcodes'],
            ['group' => 'barcode', 'key' => 'show_price_on_label', 'value' => '1', 'type' => 'boolean', 'description' => 'Display MRP/Price on printed label'],

            // Notifications
            ['group' => 'notification', 'key' => 'low_stock_threshold_alert', 'value' => '5', 'type' => 'integer', 'description' => 'Alert when stock falls below'],
            ['group' => 'notification', 'key' => 'email_daily_summary', 'value' => '1', 'type' => 'boolean', 'description' => 'Send end-of-day sales digest'],

            // Sync
            ['group' => 'sync', 'key' => 'auto_sync_interval_mins', 'value' => '5', 'type' => 'integer', 'description' => 'Periodic auto-sync frequency in minutes'],
            ['group' => 'sync', 'key' => 'conflict_resolution', 'value' => 'server_wins', 'type' => 'string', 'description' => 'Strategy when offline conflict occurs'],
        ];

        foreach ($defaultSettings as $s) {
            AppSetting::updateOrCreate(['key' => $s['key']], $s);
        }
    }
}

