# Reusable Commercial Point of Sale (POS) System

A modular, enterprise-grade Point of Sale (POS) software product designed for independent commercial client deployments with multi-branch support across diverse retail sectors (Supermarkets, Vegetable & Fruit Stores, Clothing & Textiles, Jewellery, General Retail, Wholesale, and Restaurants).

---

## Architecture Overview

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS (v4) + TanStack Query + Lucide Icons + Recharts
- **Backend:** Laravel 12 + PHP 8.2+ + MySQL + Laravel Sanctum (Token & PIN Authentication)
- **Database Architecture:** Dedicated independent database per client deployment with multi-branch segregation (`branch_id`)
- **Key Modules:** Auth & RBAC, Multi-Branch Management, Store Profile & Feature Flags, Categories, Units, Products & Variant Matrix, Branch-Specific Pricing, Customer Management, Supplier Management, Audit Logging.

---

## Project Structure

```
Reusable POS/
├── backend/                       # Laravel 12 API Service
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/ # REST API Controllers (Auth, Branches, Products, Customers, Suppliers, etc.)
│   │   ├── Http/Middleware/      # Branch access verification, feature flag guards, permission checks
│   │   ├── Http/Requests/        # Form validation requests
│   │   ├── Models/               # Eloquent Models & relationships (16 Models)
│   │   ├── Services/             # Domain business logic services
│   │   └── Traits/               # Unified API response traits
│   ├── config/                   # Laravel configuration files
│   ├── database/
│   │   ├── factories/            # Model factories (UserFactory)
│   │   ├── migrations/           # Database schema migrations (19 migrations)
│   │   └── seeders/              # Comprehensive Master Seeder (DatabaseSeeder.php)
│   ├── routes/                   # Route definitions (api.php, web.php, console.php)
│   ├── tests/                    # Feature & Unit test suites (46 tests, 268 assertions)
│   ├── .env.example              # Pre-configured environment template for MySQL
│   └── composer.json             # PHP dependencies & project scripts
│
├── frontend/                      # React 19 + TypeScript + Vite Client
│   ├── src/
│   │   ├── api/                  # Axios HTTP client & API endpoint registry
│   │   ├── components/           # Reusable UI component library (atomic layout, tables, modals)
│   │   ├── config/               # Vertical sector configuration & navigation
│   │   ├── context/              # AuthContext, ConfigContext, OfflineContext, NotificationContext
│   │   ├── pages/                # Module views (Dashboard, Products, Customers, Suppliers, etc.)
│   │   ├── services/             # Frontend API integration services
│   │   ├── types/                # Strongly-typed TypeScript interfaces
│   │   └── utils/                # Currency (₹), date, and number formatters
│   ├── public/                   # Public assets & SVG icons
│   ├── .env.example              # Pre-configured frontend environment template
│   ├── package.json              # NPM dependencies & build scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── vite.config.ts            # Vite bundler configuration
│
├── Reusable POS documentation.md # Detailed 1100+ line technical architecture & module documentation
├── package.json                  # Root convenience scripts
└── README.md                     # Project setup & developer documentation
```

---

## Team Member Setup Guide

Follow these step-by-step instructions to set up the complete Reusable POS application on your local machine.

### Prerequisites

Ensure you have the following installed on your system:
- **PHP** >= 8.2 with `pdo_mysql`, `bcmath`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `curl` extensions enabled
- **Composer** (PHP dependency manager)
- **Node.js** >= 18.x and **NPM**
- **MySQL Server** >= 8.0 (or MariaDB >= 10.4)
- **Git**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ramya-Qynova/reusable_pos.git
cd reusable_pos
```

---

### Step 2: Backend Setup (Laravel API)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install PHP dependencies via Composer:**
   ```bash
   composer install
   ```

3. **Configure the environment file:**
   Copy the `.env.example` file to `.env`:
   ```bash
   # On Windows (PowerShell / CMD)
   copy .env.example .env

   # On Linux / macOS
   cp .env.example .env
   ```

4. **Generate the Laravel application key:**
   ```bash
   php artisan key:generate
   ```

5. **Create the MySQL Database:**
   Log into your MySQL client and create a new database:
   ```sql
   CREATE DATABASE reusable_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

6. **Update Database Credentials in `backend/.env`:**
   Open `backend/.env` and verify your MySQL connection settings:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=reusable_pos
   DB_USERNAME=root
   DB_PASSWORD=your_mysql_password
   ```

7. **Run Database Migrations:**
   Run all 19 database schema migrations to construct the database tables, relationships, foreign keys, and indexes:
   ```bash
   php artisan migrate
   ```

8. **Seed Initial / Test Data:**
   Run the master database seeder to populate business profiles, vertical features, branches, roles, permissions, admin/manager/cashier users, units, categories, demo products, customer records, and supplier records:
   ```bash
   php artisan db:seed
   ```
   *(Or run both together in one step: `php artisan migrate:fresh --seed`)*

9. **Start the Backend API Server:**
   ```bash
   php artisan serve
   ```
   The backend API will start at: **http://127.0.0.1:8000**

---

### Step 3: Frontend Setup (React + Vite)

Open a new terminal window:

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies via NPM:**
   ```bash
   npm install
   ```

3. **Configure the environment file:**
   Copy `.env.example` to `.env`:
   ```bash
   # On Windows (PowerShell / CMD)
   copy .env.example .env

   # On Linux / macOS
   cp .env.example .env
   ```
   Default content:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

4. **Start the Frontend Development Server:**
   ```bash
   npm run dev
   ```
   The frontend application will start at: **http://localhost:5173**

---

### Step 4: Root Workspace Convenience Commands

From the root project directory, you can also run:
```bash
# Run frontend dev server from root
npm run dev

# Build frontend from root
npm run build
```

---

## Default Seeded Accounts & Credentials

The database seeder provisions the following accounts for immediate testing:

| Role | Email | Password | PIN Code | Default Branch Access |
|---|---|---|---|---|
| **Super Administrator** | `admin@greenmart.pos` | `admin123` | `1234` | Full access to all branches |
| **Branch Manager** | `manager@greenmart.pos` | `manager123` | `4321` | Main Branch (ID: 1) |
| **Cashier** | `cashier@greenmart.pos` | `cashier123` | `5678` | Main Branch (ID: 1), North Annex (ID: 2) |

---

## Pre-Seeded Store Data

The database seeder automatically creates:
- **Business Profile:** Green Mart Supermarket (GSTIN33AABCG1234F1Z5, Currency: ₹ INR)
- **Branches:** Main Branch (`MAIN`), North Annex (`NORTH`), Metro Center (`METRO`), Airport Express (`AIRPORT`)
- **Tax Slabs:** GST 0%, 5%, 12%, 18%, 28%
- **Product Catalog:** Categories (Dairy, Produce, Groceries, Bakery, Beverages, Apparel), Units (pcs, kg, gm, ltr, ml, pk, box), master products with variants (size/color matrix) and branch-specific price overrides
- **Customers Master:** 5 pre-configured customer accounts including Walk-in counter customer, retail customers, and corporate accounts
- **Suppliers Master:** 4 pre-configured suppliers covering agro wholesale, dairy, bakery, and beverage distributors

---

## Database Migrations Reference

The repository includes all 19 database migrations in `backend/database/migrations`:

1. `0001_01_01_000000_create_users_table.php` - Users, password reset tokens, sessions
2. `0001_01_01_000001_create_cache_table.php` - Cache and cache locks
3. `0001_01_01_000002_create_jobs_table.php` - Queue jobs, batches, failed jobs
4. `2026_10_30_071430_create_personal_access_tokens_table.php` - Laravel Sanctum API tokens
5. `2026_10_30_071431_create_business_profiles_table.php` - Business identity, legal details, currency, timezone
6. `2026_10_30_071432_create_business_features_table.php` - Vertical sector toggles (scale, perishable, batch, etc.)
7. `2026_10_30_071433_create_tax_slabs_table.php` - CGST/SGST/IGST tax slabs
8. `2026_10_30_071434_create_branches_table.php` - Branch locations and contact records
9. `2026_10_30_071435_create_roles_and_permissions_tables.php` - Enterprise RBAC roles, permissions, permission_role pivot
10. `2026_10_30_071436_create_user_branch_roles_table.php` - User-to-branch role assignment pivot
11. `2026_10_30_071437_create_audit_logs_table.php` - Enterprise audit logging for security and compliance
12. `2026_10_30_072001_create_categories_table.php` - Hierarchical category and subcategory tree
13. `2026_10_30_072002_create_units_table.php` - Units of measurement (fractional/decimal control)
14. `2026_10_30_072003_create_products_table.php` - Master products catalog (SKU, barcode, HSN, tax rate, pricing)
15. `2026_10_30_072004_create_product_variants_table.php` - Product variant combinations (color, size, etc.)
16. `2026_10_30_072005_create_branch_product_prices_table.php` - Branch-specific price and promo overrides
17. `2026_10_30_082001_add_attribute_fingerprint_to_product_variants_table.php` - Normalized JSON attribute fingerprint for variant uniqueness
18. `2026_10_30_090001_create_customers_table.php` - Customer directory with contact details, GSTIN, soft deletes
19. `2026_10_30_090002_create_suppliers_table.php` - Supplier directory with contact persons, GSTIN, soft deletes

---

## Running Automated Tests

### Backend Feature & Unit Tests (PHPUnit)
```bash
cd backend
php artisan test
```
*Current test suite: **46 passing tests**, **268 assertions** verifying Authentication, Branch Context Security, Product & Pricing Logic, Customer Management, and Supplier Management.*

### Frontend Typecheck & Build Verification
```bash
cd frontend
npm run build
```

---

## Security & Version Control Notice

- Sensitive files such as `backend/.env`, `frontend/.env`, API keys, database credentials, `backend/vendor/`, and `node_modules/` are strictly excluded via `.gitignore`.
- Always use the provided `.env.example` templates to create local configuration files.
- Never commit actual customer or business financial data to version control.
