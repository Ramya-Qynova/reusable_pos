import React from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Building2,
  Truck,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { NavItem } from '../types/navigation'

/**
 * 8 Main Top Navigation Modules:
 * 1. Dashboard
 * 2. Sales
 * 3. Products
 * 4. Inventory
 * 5. Customers
 * 6. Purchases
 * 7. Reports
 * 8. Settings
 */
export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: (props) => React.createElement(LayoutDashboard, props),
    description: 'Store KPIs, financial overview, and real-time operations',
  },
  {
    id: 'sales',
    label: 'Sales',
    path: '/sales',
    icon: (props) => React.createElement(ShoppingCart, props),
    description: 'POS billing, sales orders, invoices, and returns',
  },
  {
    id: 'products',
    label: 'Products',
    path: '/products',
    icon: (props) => React.createElement(Package, props),
    description: 'Product catalog, categories, barcodes, and pricing',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    icon: (props) => React.createElement(Boxes, props),
    description: 'Stock tracking, stock adjustment, transfer, and low stock',
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: (props) => React.createElement(Users, props),
    description: 'Customer directory, contact profiles, and tax details',
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    path: '/suppliers',
    icon: (props) => React.createElement(Building2, props),
    description: 'Supplier directory, vendor contacts, and procurement profiles',
  },
  {
    id: 'purchases',
    label: 'Purchases',
    path: '/purchases',
    icon: (props) => React.createElement(Truck, props),
    description: 'Purchase orders and goods receipt (GRN)',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: (props) => React.createElement(BarChart3, props),
    description: 'Sales analytics, profit & loss, and audit reports',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: (props) => React.createElement(Settings, props),
    description: 'Store preferences, receipt printers, and tax settings',
  },
]

/**
 * Product Architecture Reference:
 * Preserved architectural placement for features removed from main navigation:
 * - Business & Branch Selector: Dashboard header.
 * - Global Search: Dashboard header.
 * - Finance: Relevant sections inside Sales (Payment History, Cash Drawer),
 *            Purchases (Vendor Invoices), and Reports (P&L, Day End, Reconciliation).
 * - Users and Employees: Settings (Staff Directory, Cashier Shifts, Roles & Permissions).
 */
export const ARCHITECTURAL_MODULE_MAPPING = {
  finance: {
    placement: ['sales', 'purchases', 'reports'],
    submodules: [
      { id: 'cash_drawer', parentModule: 'sales', label: 'Cash Drawer' },
      { id: 'payment_history', parentModule: 'sales', label: 'Payment History' },
      { id: 'purchase_invoices', parentModule: 'purchases', label: 'Purchase Invoices' },
      { id: 'pnl', parentModule: 'reports', label: 'Profit & Loss Statement' },
      { id: 'day_end', parentModule: 'reports', label: 'Day End Summary' },
      { id: 'reconciliation', parentModule: 'reports', label: 'Payment Reconciliation' },
      { id: 'tax_audit', parentModule: 'reports', label: 'Tax Audit' },
    ],
  },
  users: {
    placement: ['settings'],
    submodules: [
      { id: 'staff_directory', parentModule: 'settings', label: 'Staff Directory' },
      { id: 'roles_permissions', parentModule: 'settings', label: 'Roles & Permissions' },
      { id: 'cashier_shifts', parentModule: 'settings', label: 'Cashier Shifts' },
      { id: 'activity_logs', parentModule: 'settings', label: 'Activity Logs' },
    ],
  },
} as const
