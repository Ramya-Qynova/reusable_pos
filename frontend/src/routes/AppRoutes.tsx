import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import DashboardPage from '../pages/DashboardPage'
import SalesPage from '../pages/SalesPage'
import ProductsPage from '../pages/ProductsPage'
import CustomersPage from '../pages/CustomersPage'
import SuppliersPage from '../pages/SuppliersPage'
import { InventoryPage } from '../pages/InventoryPage'
import { PurchasesPage } from '../pages/PurchasesPage'
import { SettingsPage } from '../pages/SettingsPage'
import ModulePlaceholder from '../pages/ModulePlaceholder'

export const AppRoutes: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<DashboardPage />} />

        {/* Sales & POS */}
        <Route path="/sales" element={<SalesPage />} />

        {/* Module 1: Products */}
        <Route path="/products" element={<ProductsPage />} />

        {/* Module 2: Inventory */}
        <Route path="/inventory" element={<InventoryPage />} />

        {/* Module 3: Purchases */}
        <Route path="/purchases" element={<PurchasesPage />} />

        {/* Module 4: Customers Master */}
        <Route path="/customers" element={<CustomersPage />} />

        {/* Suppliers Master */}
        <Route path="/suppliers" element={<SuppliersPage />} />

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
          element={<Navigate to="/settings" replace />}
        />

        {/* Module 5: Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Offline fallback redirect */}
        <Route path="/offline" element={<Navigate to="/" replace />} />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  )
}

export default AppRoutes
