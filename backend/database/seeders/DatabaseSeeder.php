<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\BranchProductPrice;
use App\Models\BusinessFeature;
use App\Models\BusinessProfile;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\TaxSlab;
use App\Models\Unit;
use App\Models\User;
use App\Models\UserBranchRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Business Profile
        BusinessProfile::updateOrCreate(
            ['id' => 1],
            [
                'business_name' => 'Green Mart Supermarket',
                'legal_name' => 'Green Mart Retail Private Limited',
                'tax_id' => 'GSTIN33AABCG1234F1Z5',
                'currency_code' => 'INR',
                'currency_symbol' => '₹',
                'timezone' => 'Asia/Kolkata',
                'active_vertical' => 'supermarket',
                'email' => 'manager@greenmart.pos',
                'phone' => '+91 98765 43210',
                'address' => '124, Commercial Road, Central Market',
            ]
        );

        // 2. Business Vertical Features
        $features = [
            'weightScaleBilling' => true,
            'perishableStock' => true,
            'batchAndExpiry' => true,
            'sizeColorVariants' => true,
            'jewelleryPurityAndMakingCharges' => false,
            'tableManagement' => false,
            'kitchenOrderTicket' => false,
            'barcodeScanning' => true,
            'wholesaleTiers' => false,
            'serialNumberTracking' => false,
        ];

        foreach ($features as $key => $enabled) {
            BusinessFeature::updateOrCreate(
                ['feature_key' => $key],
                ['is_enabled' => $enabled]
            );
        }

        // 3. Tax Slabs
        $taxSlabs = [
            ['name' => 'GST 0%', 'rate' => 0.00, 'cgst_rate' => 0.00, 'sgst_rate' => 0.00, 'igst_rate' => 0.00],
            ['name' => 'GST 5%', 'rate' => 5.00, 'cgst_rate' => 2.50, 'sgst_rate' => 2.50, 'igst_rate' => 5.00],
            ['name' => 'GST 12%', 'rate' => 12.00, 'cgst_rate' => 6.00, 'sgst_rate' => 6.00, 'igst_rate' => 12.00],
            ['name' => 'GST 18%', 'rate' => 18.00, 'cgst_rate' => 9.00, 'sgst_rate' => 9.00, 'igst_rate' => 18.00],
            ['name' => 'GST 28%', 'rate' => 28.00, 'cgst_rate' => 14.00, 'sgst_rate' => 14.00, 'igst_rate' => 28.00],
        ];

        $slabsByName = [];
        foreach ($taxSlabs as $slab) {
            $slabsByName[$slab['name']] = TaxSlab::updateOrCreate(['name' => $slab['name']], $slab);
        }

        // 4. Store Branches
        $mainBranch = Branch::updateOrCreate(
            ['branch_code' => 'MAIN'],
            [
                'name' => 'Main Branch',
                'location' => 'Downtown Central Market',
                'address' => '124, Commercial Road, Central Market',
                'phone' => '+91 98765 43210',
                'email' => 'main@greenmart.pos',
                'is_main_branch' => true,
                'is_active' => true,
            ]
        );

        $northBranch = Branch::updateOrCreate(
            ['branch_code' => 'NORTH'],
            [
                'name' => 'North Annex',
                'location' => 'North Avenue Commercial Hub',
                'address' => 'Shop 12, North Commercial Complex',
                'phone' => '+91 98765 43211',
                'email' => 'north@greenmart.pos',
                'is_main_branch' => false,
                'is_active' => true,
            ]
        );

        Branch::updateOrCreate(
            ['branch_code' => 'METRO'],
            [
                'name' => 'Metro Center',
                'location' => 'Sector 4 City Galleria',
                'address' => 'Galleria Mall Lower Ground',
                'phone' => '+91 98765 43212',
                'email' => 'metro@greenmart.pos',
                'is_main_branch' => false,
                'is_active' => true,
            ]
        );

        $airportBranch = Branch::updateOrCreate(
            ['branch_code' => 'AIRPORT'],
            [
                'name' => 'Airport Express',
                'location' => 'Terminal 2 Departure Hall',
                'address' => 'T2 Departures Kiosk 4',
                'phone' => '+91 98765 43213',
                'email' => 'airport@greenmart.pos',
                'is_main_branch' => false,
                'is_active' => true,
            ]
        );

        // 5. System Roles
        $adminRole = Role::updateOrCreate(['slug' => 'admin'], [
            'name' => 'Administrator',
            'description' => 'Full administrative access to store configuration and operations',
            'is_system' => true,
        ]);

        $managerRole = Role::updateOrCreate(['slug' => 'branch_manager'], [
            'name' => 'Branch Manager',
            'description' => 'Oversees daily sales, cashier registers, and inventory in assigned branch',
            'is_system' => true,
        ]);

        $cashierRole = Role::updateOrCreate(['slug' => 'cashier'], [
            'name' => 'Cashier',
            'description' => 'Operates counter billing, orders, and customer checkout',
            'is_system' => true,
        ]);

        $inventoryRole = Role::updateOrCreate(['slug' => 'inventory_clerk'], [
            'name' => 'Inventory Clerk',
            'description' => 'Manages stock counts, adjustments, and branch transfers',
            'is_system' => true,
        ]);

        $accountantRole = Role::updateOrCreate(['slug' => 'accountant'], [
            'name' => 'Accountant',
            'description' => 'Audits financial P&L, taxes, and supplier payables',
            'is_system' => true,
        ]);

        // 6. Permissions
        $permissions = [
            ['slug' => 'pos.billing', 'module' => 'sales', 'description' => 'Execute counter POS sales transactions'],
            ['slug' => 'pos.discount', 'module' => 'sales', 'description' => 'Apply custom discounts to bills'],
            ['slug' => 'pos.returns', 'module' => 'sales', 'description' => 'Process customer returns and refunds'],
            ['slug' => 'cash.drawer', 'module' => 'sales', 'description' => 'Open, close, and reconcile cashier cash drawers'],
            ['slug' => 'catalog.manage', 'module' => 'products', 'description' => 'Create and modify product catalog and prices'],
            ['slug' => 'inventory.adjust', 'module' => 'inventory', 'description' => 'Create stock adjustments and write-offs'],
            ['slug' => 'inventory.transfer', 'module' => 'inventory', 'description' => 'Dispatch and receive inter-branch transfers'],
            ['slug' => 'purchases.manage', 'module' => 'purchases', 'description' => 'Create POs and record GRN receipts'],
            ['slug' => 'customers.manage', 'module' => 'customers', 'description' => 'Manage customer profiles and credit limits'],
            ['slug' => 'suppliers.manage', 'module' => 'suppliers', 'description' => 'Manage supplier profiles and vendor directory'],
            ['slug' => 'reports.view_pnl', 'module' => 'reports', 'description' => 'View P&L and financial statements'],
            ['slug' => 'settings.manage', 'module' => 'settings', 'description' => 'Manage store profile and hardware setup'],
        ];

        foreach ($permissions as $perm) {
            $createdPerm = Permission::updateOrCreate(['slug' => $perm['slug']], $perm);
            $adminRole->permissions()->syncWithoutDetaching([$createdPerm->id]);

            if (in_array($perm['slug'], ['pos.billing', 'pos.discount', 'pos.returns', 'cash.drawer', 'inventory.adjust', 'inventory.transfer', 'reports.view_pnl', 'customers.manage', 'suppliers.manage'])) {
                $managerRole->permissions()->syncWithoutDetaching([$createdPerm->id]);
            }

            if (in_array($perm['slug'], ['pos.billing', 'cash.drawer'])) {
                $cashierRole->permissions()->syncWithoutDetaching([$createdPerm->id]);
            }

            if (in_array($perm['slug'], ['inventory.adjust', 'inventory.transfer', 'purchases.manage'])) {
                $inventoryRole->permissions()->syncWithoutDetaching([$createdPerm->id]);
            }

            if (in_array($perm['slug'], ['reports.view_pnl', 'purchases.manage', 'suppliers.manage'])) {
                $accountantRole->permissions()->syncWithoutDetaching([$createdPerm->id]);
            }
        }

        // 7. Users
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@greenmart.pos'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('admin123'),
                'pin_code' => Hash::make('1234'),
                'is_super_admin' => true,
                'is_active' => true,
            ]
        );

        $manager = User::updateOrCreate(
            ['email' => 'manager@greenmart.pos'],
            [
                'name' => 'Ramesh Manager',
                'password' => Hash::make('manager123'),
                'pin_code' => Hash::make('4321'),
                'is_super_admin' => false,
                'is_active' => true,
            ]
        );

        UserBranchRole::updateOrCreate(
            ['user_id' => $manager->id, 'branch_id' => $mainBranch->id, 'role_id' => $managerRole->id]
        );

        $cashier = User::updateOrCreate(
            ['email' => 'cashier@greenmart.pos'],
            [
                'name' => 'Priya Cashier',
                'password' => Hash::make('cashier123'),
                'pin_code' => Hash::make('5678'),
                'is_super_admin' => false,
                'is_active' => true,
            ]
        );

        UserBranchRole::updateOrCreate(
            ['user_id' => $cashier->id, 'branch_id' => $mainBranch->id, 'role_id' => $cashierRole->id]
        );

        UserBranchRole::updateOrCreate(
            ['user_id' => $cashier->id, 'branch_id' => $northBranch->id, 'role_id' => $cashierRole->id]
        );

        // ==========================================
        // 8. Phase 2: Units of Measurement
        // ==========================================
        $units = [
            ['name' => 'Pieces', 'short_code' => 'pcs', 'allow_decimals' => false],
            ['name' => 'Kilogram', 'short_code' => 'kg', 'allow_decimals' => true],
            ['name' => 'Gram', 'short_code' => 'gm', 'allow_decimals' => true],
            ['name' => 'Litre', 'short_code' => 'ltr', 'allow_decimals' => true],
            ['name' => 'Millilitre', 'short_code' => 'ml', 'allow_decimals' => true],
            ['name' => 'Pack', 'short_code' => 'pk', 'allow_decimals' => false],
            ['name' => 'Box', 'short_code' => 'box', 'allow_decimals' => false],
        ];

        $unitModels = [];
        foreach ($units as $u) {
            $unitModels[$u['short_code']] = Unit::updateOrCreate(['short_code' => $u['short_code']], $u);
        }

        // ==========================================
        // 9. Phase 2: Categories (Hierarchy)
        // ==========================================
        $dairyCat = Category::updateOrCreate(
            ['slug' => 'dairy-eggs'],
            ['name' => 'Dairy & Eggs', 'description' => 'Milk, yogurt, cheeses, and eggs', 'is_active' => true]
        );

        $produceCat = Category::updateOrCreate(
            ['slug' => 'fresh-produce'],
            ['name' => 'Fresh Produce', 'description' => 'Farm fresh vegetables and fruits', 'is_active' => true]
        );

        $vegCat = Category::updateOrCreate(
            ['slug' => 'vegetables'],
            ['parent_id' => $produceCat->id, 'name' => 'Vegetables', 'description' => 'Fresh seasonal vegetables', 'is_active' => true]
        );

        $fruitCat = Category::updateOrCreate(
            ['slug' => 'fruits'],
            ['parent_id' => $produceCat->id, 'name' => 'Fruits', 'description' => 'Fresh seasonal fruits', 'is_active' => true]
        );

        $groceryCat = Category::updateOrCreate(
            ['slug' => 'groceries'],
            ['name' => 'Groceries & Staples', 'description' => 'Flours, grains, pulses, and spices', 'is_active' => true]
        );

        $bakeryCat = Category::updateOrCreate(
            ['slug' => 'bakery-snacks'],
            ['name' => 'Bakery & Snacks', 'description' => 'Breads, buns, cookies, and chips', 'is_active' => true]
        );

        $bevCat = Category::updateOrCreate(
            ['slug' => 'beverages'],
            ['name' => 'Beverages', 'description' => 'Tea, coffee, juices, and soft drinks', 'is_active' => true]
        );

        $apparelCat = Category::updateOrCreate(
            ['slug' => 'apparel'],
            ['name' => 'Apparel & Clothing', 'description' => 'Garments and retail textiles', 'is_active' => true]
        );

        // ==========================================
        // 10. Phase 2: Master Products
        // ==========================================
        // Product 1: Whole Milk 1L
        $milk = Product::updateOrCreate(
            ['sku' => 'MILK-1L'],
            [
                'category_id' => $dairyCat->id,
                'unit_id' => $unitModels['ltr']->id,
                'tax_slab_id' => $slabsByName['GST 5%']->id,
                'name' => 'Whole Milk 1L',
                'barcode' => '8901234567890',
                'hsn_code' => '0401',
                'tax_rate' => 5.00,
                'is_tax_inclusive' => true,
                'cost_price' => 50.00,
                'selling_price' => 60.00,
                'minimum_stock' => 20.00,
                'has_variants' => false,
                'is_active' => true,
            ]
        );

        // Product 2: Brown Organic Eggs
        $eggs = Product::updateOrCreate(
            ['sku' => 'EGGS-BRN-6'],
            [
                'category_id' => $dairyCat->id,
                'unit_id' => $unitModels['pk']->id,
                'tax_slab_id' => $slabsByName['GST 0%']->id,
                'name' => 'Brown Organic Eggs (Pack of 6)',
                'barcode' => '8901234567891',
                'hsn_code' => '0407',
                'tax_rate' => 0.00,
                'is_tax_inclusive' => true,
                'cost_price' => 65.00,
                'selling_price' => 85.00,
                'minimum_stock' => 15.00,
                'has_variants' => false,
                'is_active' => true,
            ]
        );

        // Product 3: Organic Red Tomato (Decimal unit kg)
        $tomato = Product::updateOrCreate(
            ['sku' => 'VEG-TOMATO'],
            [
                'category_id' => $vegCat->id,
                'unit_id' => $unitModels['kg']->id,
                'tax_slab_id' => $slabsByName['GST 0%']->id,
                'name' => 'Organic Red Tomato',
                'barcode' => '8901234567892',
                'hsn_code' => '0702',
                'tax_rate' => 0.00,
                'is_tax_inclusive' => true,
                'cost_price' => 25.00,
                'selling_price' => 38.00,
                'minimum_stock' => 50.00,
                'has_variants' => false,
                'is_active' => true,
            ]
        );

        // Product 4: Artisan Sourdough Bread
        $bread = Product::updateOrCreate(
            ['sku' => 'BAK-SOURDOUGH'],
            [
                'category_id' => $bakeryCat->id,
                'unit_id' => $unitModels['pcs']->id,
                'tax_slab_id' => $slabsByName['GST 5%']->id,
                'name' => 'Artisan Sourdough Bread',
                'barcode' => '8901234567893',
                'hsn_code' => '1905',
                'tax_rate' => 5.00,
                'is_tax_inclusive' => true,
                'cost_price' => 40.00,
                'selling_price' => 65.00,
                'minimum_stock' => 10.00,
                'has_variants' => false,
                'is_active' => true,
            ]
        );

        // Product 5: Arabica Roast Coffee Beans 250g
        $coffee = Product::updateOrCreate(
            ['sku' => 'BEV-COFFEE-250'],
            [
                'category_id' => $bevCat->id,
                'unit_id' => $unitModels['pk']->id,
                'tax_slab_id' => $slabsByName['GST 12%']->id,
                'name' => 'Arabica Roast Coffee Beans 250g',
                'barcode' => '8901234567894',
                'hsn_code' => '0901',
                'tax_rate' => 12.00,
                'is_tax_inclusive' => true,
                'cost_price' => 220.00,
                'selling_price' => 320.00,
                'minimum_stock' => 10.00,
                'has_variants' => false,
                'is_active' => true,
            ]
        );

        // Product 6: Apparel with Variants (T-shirt)
        $tshirt = Product::updateOrCreate(
            ['sku' => 'APP-CREW-TSHIRT'],
            [
                'category_id' => $apparelCat->id,
                'unit_id' => $unitModels['pcs']->id,
                'tax_slab_id' => $slabsByName['GST 12%']->id,
                'name' => 'Classic Cotton Crewneck T-Shirt',
                'barcode' => null,
                'hsn_code' => '6109',
                'tax_rate' => 12.00,
                'is_tax_inclusive' => true,
                'cost_price' => 250.00,
                'selling_price' => 499.00,
                'minimum_stock' => 20.00,
                'has_variants' => true,
                'is_active' => true,
            ]
        );

        // Variants for T-shirt
        $variants = [
            ['variant_sku' => 'APP-TSHIRT-BLK-M', 'variant_barcode' => '8901234567801', 'attributes_json' => ['color' => 'Black', 'size' => 'M'], 'cost_price' => 250.00, 'selling_price' => 499.00],
            ['variant_sku' => 'APP-TSHIRT-BLK-L', 'variant_barcode' => '8901234567802', 'attributes_json' => ['color' => 'Black', 'size' => 'L'], 'cost_price' => 250.00, 'selling_price' => 499.00],
            ['variant_sku' => 'APP-TSHIRT-WHT-M', 'variant_barcode' => '8901234567803', 'attributes_json' => ['color' => 'White', 'size' => 'M'], 'cost_price' => 250.00, 'selling_price' => 499.00],
            ['variant_sku' => 'APP-TSHIRT-WHT-L', 'variant_barcode' => '8901234567804', 'attributes_json' => ['color' => 'White', 'size' => 'L'], 'cost_price' => 250.00, 'selling_price' => 499.00],
        ];

        foreach ($variants as $v) {
            ProductVariant::updateOrCreate(
                ['product_id' => $tshirt->id, 'variant_sku' => $v['variant_sku']],
                $v
            );
        }

        // ==========================================
        // 11. Phase 2: Branch-Specific Price Overrides
        // ==========================================
        // Airport Express branch has premium pricing on Milk & Coffee
        BranchProductPrice::updateOrCreate(
            [
                'branch_id' => $airportBranch->id,
                'product_id' => $milk->id,
                'variant_id' => null,
            ],
            [
                'selling_price' => 75.00,
                'special_price' => null,
                'is_active' => true,
            ]
        );

        BranchProductPrice::updateOrCreate(
            [
                'branch_id' => $airportBranch->id,
                'product_id' => $coffee->id,
                'variant_id' => null,
            ],
            [
                'selling_price' => 380.00,
                'special_price' => null,
                'is_active' => true,
            ]
        );

        // ==========================================
        // 12. Phase 3: Customers Master Seed
        // ==========================================
        $customers = [
            [
                'customer_code' => 'CUST-00001',
                'name' => 'Walk-in Retail Customer',
                'phone' => '+91 99999 00000',
                'alternate_phone' => null,
                'email' => 'walkin@store.local',
                'address' => 'Counter Cash Sales',
                'city' => 'Central City',
                'state' => 'Tamil Nadu',
                'postal_code' => '600001',
                'tax_number' => null,
                'notes' => 'Default walk-in counter customer record',
                'is_active' => true,
            ],
            [
                'customer_code' => 'CUST-00002',
                'name' => 'John Doe',
                'phone' => '+91 98111 22334',
                'alternate_phone' => '+91 98111 99887',
                'email' => 'john.doe@example.com',
                'address' => '42, Sunset Boulevard, Flat 3B',
                'city' => 'Central Market',
                'state' => 'Tamil Nadu',
                'postal_code' => '600002',
                'tax_number' => null,
                'notes' => 'Regular grocery customer, prefers evening deliveries',
                'is_active' => true,
            ],
            [
                'customer_code' => 'CUST-00003',
                'name' => 'Sarah Jenkins',
                'phone' => '+91 98222 33445',
                'alternate_phone' => null,
                'email' => 'sarah.jenkins@example.com',
                'address' => '15, North Lake Avenue',
                'city' => 'North City',
                'state' => 'Tamil Nadu',
                'postal_code' => '600018',
                'tax_number' => null,
                'notes' => 'Organic section regular buyer',
                'is_active' => true,
            ],
            [
                'customer_code' => 'CUST-00004',
                'name' => 'TechCorp Solutions Pvt Ltd',
                'phone' => '+91 98777 66554',
                'alternate_phone' => '+91 44 2828 1234',
                'email' => 'procurement@techcorp.com',
                'address' => 'Tech Park Tower 4, Sector 7',
                'city' => 'Central City',
                'state' => 'Tamil Nadu',
                'postal_code' => '600113',
                'tax_number' => 'GSTIN33AABCT9988K1Z3',
                'notes' => 'Corporate account for pantry and office supplies',
                'is_active' => true,
            ],
            [
                'customer_code' => 'CUST-00005',
                'name' => 'Anita Sharma',
                'phone' => '+91 98444 55667',
                'alternate_phone' => null,
                'email' => 'anita.sharma@example.com',
                'address' => '88, Garden Road, Phase 2',
                'city' => 'North City',
                'state' => 'Tamil Nadu',
                'postal_code' => '600040',
                'tax_number' => null,
                'notes' => 'Inactive customer profile for testing filters',
                'is_active' => false,
            ],
        ];

        foreach ($customers as $c) {
            Customer::updateOrCreate(['customer_code' => $c['customer_code']], $c);
        }

        // ==========================================
        // 13. Phase 3: Suppliers Master Seed
        // ==========================================
        $suppliers = [
            [
                'supplier_code' => 'SUP-00001',
                'name' => 'Fresh Farm Agro Wholesale',
                'contact_person' => 'Ramesh Patel',
                'phone' => '+91 98100 11223',
                'alternate_phone' => '+91 98100 99881',
                'email' => 'orders@freshfarmagro.com',
                'address' => 'Plot 45, Agro Market Yard',
                'city' => 'Central Market',
                'state' => 'Tamil Nadu',
                'postal_code' => '600079',
                'tax_number' => 'GSTIN33AABCF4567M1Z1',
                'notes' => 'Primary vendor for fresh fruits and organic vegetables',
                'is_active' => true,
            ],
            [
                'supplier_code' => 'SUP-00002',
                'name' => 'Supreme Dairy & Poultry Co.',
                'contact_person' => 'Suresh Kumar',
                'phone' => '+91 98200 22334',
                'alternate_phone' => null,
                'email' => 'distribution@supremedairy.com',
                'address' => 'Dairy Complex Road, Kanchipuram Highway',
                'city' => 'Central City',
                'state' => 'Tamil Nadu',
                'postal_code' => '600095',
                'tax_number' => 'GSTIN33AABCS8901N1Z2',
                'notes' => 'Daily supplier for milk, cheese, and farm eggs',
                'is_active' => true,
            ],
            [
                'supplier_code' => 'SUP-00003',
                'name' => 'Golden Harvest Bakery Supply',
                'contact_person' => 'Vikram Joshi',
                'phone' => '+91 98300 33445',
                'alternate_phone' => '+91 44 2490 8877',
                'email' => 'sales@goldenharvest.com',
                'address' => 'SIDCO Industrial Estate, Ambattur',
                'city' => 'North City',
                'state' => 'Tamil Nadu',
                'postal_code' => '600058',
                'tax_number' => 'GSTIN33AABCG2345P1Z4',
                'notes' => 'Packaged bakery goods, bread, and baking ingredients',
                'is_active' => true,
            ],
            [
                'supplier_code' => 'SUP-00004',
                'name' => 'Everest Beverages & Snacks Ltd.',
                'contact_person' => 'Deepak Verma',
                'phone' => '+91 98500 55667',
                'alternate_phone' => null,
                'email' => 'deepak@everestbev.com',
                'address' => '78, Ring Road Logistics Hub',
                'city' => 'Metro Center',
                'state' => 'Tamil Nadu',
                'postal_code' => '600099',
                'tax_number' => 'GSTIN33AABCE1234R1Z8',
                'notes' => 'Former cold beverage vendor (Deactivated)',
                'is_active' => false,
            ],
        ];

        foreach ($suppliers as $s) {
            Supplier::updateOrCreate(['supplier_code' => $s['supplier_code']], $s);
        }
    }
}
