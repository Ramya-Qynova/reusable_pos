import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import DashboardPage from '../pages/DashboardPage'
import ProductsPage from '../pages/ProductsPage'
import ModulePlaceholder from '../pages/ModulePlaceholder'

export const AppRoutes: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        {/* Phase 1: Fully Developed Page */}
        <Route path="/" element={<DashboardPage />} />

        {/* 10 Main Navigation Modules */}
        <Route
          path="/sales"
          element={<ModulePlaceholder moduleId="sales" title="Sales" subtitle="POS billing, order management, invoices, and returns." />}
        />
        {/* Phase 2: Fully Developed Products Page */}
        <Route path="/products" element={<ProductsPage />} />
        <Route
          path="/inventory"
          element={<ModulePlaceholder moduleId="inventory" title="Inventory" subtitle="Stock tracking, stock adjustment, transfer, and low stock." />}
        />
        <Route
          path="/customers"
          element={<ModulePlaceholder moduleId="customers" title="Customers" subtitle="Customer directory, loyalty points, and credit accounts." />}
        />
        <Route
          path="/purchases"
          element={<ModulePlaceholder moduleId="purchases" title="Purchases" subtitle="Vendor management, purchase orders, and goods receipt (GRN)." />}
        />
        {/* Backward compatibility alias for /suppliers */}
        <Route path="/suppliers" element={<Navigate to="/purchases" replace />} />

        <Route
          path="/finance"
          element={<ModulePlaceholder moduleId="finance" title="Finance" subtitle="Payment reconciliation, cash drawers, and expenses." />}
        />
        {/* Backward compatibility alias for /payments */}
        <Route path="/payments" element={<Navigate to="/finance" replace />} />

        <Route
          path="/reports"
          element={<ModulePlaceholder moduleId="reports" title="Reports" subtitle="Sales summaries, financial P&L statements, and tax audits." />}
        />
        <Route
          path="/users"
          element={<ModulePlaceholder moduleId="users" title="Users" subtitle="Staff directory, cashier shifts, and role-based access control." />}
        />
        <Route
          path="/settings"
          element={<ModulePlaceholder moduleId="settings" title="Settings" subtitle="Store setup, receipt printers, taxation, and vertical modules." />}
        />

        {/* Offline fallback redirect */}
        <Route path="/offline" element={<Navigate to="/" replace />} />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  )
}

export default AppRoutes
