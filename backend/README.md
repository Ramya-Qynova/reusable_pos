# Backend Architecture (Laravel API Service)

This directory contains the **Laravel 11 + PHP + MySQL** backend API service.

## Architecture Guidelines
- **Single-Client Deployment**: Each client gets an independent installation with its own dedicated MySQL database.
- **Multi-Branch Native**: Each installation supports multiple branches (`branches` table) using `branch_id`.
- **Dedicated Architecture**: Independent database per deployment, no shared SaaS infrastructure, and no cross-business data mixing.
- **Centralized Master Data**: Business profiles, feature flags, product catalog, units, categories, and tax slabs.
- **Branch-Specific Operations**: Branch stock balances, cash drawer shifts, POS sales orders, invoices, and purchase GRNs.

## Scope & API Endpoints
- **Authentication & RBAC**: `/api/v1/auth` (Sanctum tokens, multi-branch user roles)
- **Branch Management**: `/api/v1/branches` (Branch access validation, active branch context)
- **Store Settings & Features**: `/api/v1/settings` (Business profile, vertical feature flags, tax slabs)
- **Products Master**: `/api/v1/products`
- **Real-time Inventory & Stock**: `/api/v1/inventory`
- **Customer Accounts & Credit (Khata)**: `/api/v1/customers`
- **Suppliers & Purchase Orders**: `/api/v1/purchases`
- **Sales & Counter Invoicing**: `/api/v1/sales`
- **Financial P&L & Tax Reporting**: `/api/v1/reports`
- **Two-Way Offline Sync Engine**: `/api/v1/sync`
