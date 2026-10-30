import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Sparkles } from 'lucide-react'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { PageHeader } from '../components/layout/PageHeader'
import { cn } from '../utils/cn'

interface SubmoduleDef {
  id: string
  label: string
}

const MODULE_SUBMODULES: Record<string, SubmoduleDef[]> = {
  sales: [
    { id: 'billing', label: 'POS Billing' },
    { id: 'orders', label: 'Sales Orders' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'returns', label: 'Returns & Refunds' },
    { id: 'history', label: 'Payment History' },
  ],
  products: [
    { id: 'catalog', label: 'Product Catalog' },
    { id: 'categories', label: 'Categories' },
    { id: 'barcodes', label: 'Barcodes & Labels' },
    { id: 'pricing', label: 'Price Rules' },
    { id: 'units', label: 'Units of Measure' },
  ],
  inventory: [
    { id: 'overview', label: 'Stock Overview' },
    { id: 'adjustment', label: 'Stock Adjustment' },
    { id: 'transfer', label: 'Stock Transfer' },
    { id: 'history', label: 'Stock History' },
    { id: 'low_stock', label: 'Low Stock' },
  ],
  customers: [
    { id: 'directory', label: 'Customer Directory' },
    { id: 'loyalty', label: 'Loyalty Points' },
    { id: 'credit', label: 'Credit Accounts' },
    { id: 'groups', label: 'Customer Groups' },
  ],
  purchases: [
    { id: 'orders', label: 'Purchase Orders' },
    { id: 'grn', label: 'Goods Receipt (GRN)' },
    { id: 'suppliers', label: 'Suppliers Directory' },
    { id: 'invoices', label: 'Purchase Invoices' },
  ],
  finance: [
    { id: 'cash_drawer', label: 'Cash Drawer' },
    { id: 'day_end', label: 'Day End Summary' },
    { id: 'expenses', label: 'Expense Tracking' },
    { id: 'reconciliation', label: 'Payment Reconciliation' },
    { id: 'tax', label: 'Tax Summary' },
  ],
  reports: [
    { id: 'daily_sales', label: 'Daily Sales Report' },
    { id: 'pnl', label: 'Profit & Loss Statement' },
    { id: 'inventory_val', label: 'Inventory Valuation' },
    { id: 'tax_audit', label: 'Tax Audit' },
    { id: 'shift_reports', label: 'Cashier Shift Reports' },
  ],
  users: [
    { id: 'staff', label: 'Staff Directory' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'shifts', label: 'Cashier Shifts' },
    { id: 'logs', label: 'Activity Logs' },
  ],
  settings: [
    { id: 'general', label: 'General & Store Info' },
    { id: 'users', label: 'Users & Employees' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'printers', label: 'Receipt & Printers' },
    { id: 'taxation', label: 'Taxes & Currency' },
    { id: 'vertical', label: 'Business Vertical' },
    { id: 'peripherals', label: 'Hardware & Barcode' },
  ],
}

interface ModulePlaceholderProps {
  moduleId: string
  title: string
  subtitle?: string
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleId,
  title,
  subtitle,
}) => {
  const submodules = MODULE_SUBMODULES[moduleId] || []
  const [activeTab, setActiveTab] = useState(submodules[0]?.id || '')

  const currentSubmoduleName =
    submodules.find((s) => s.id === activeTab)?.label || 'Overview'

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Page Header */}
      <PageHeader
        title={title}
        subtitle={
          subtitle || `Manage your store's ${title.toLowerCase()} operations and configuration.`
        }
        actions={
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Dashboard
            </Button>
          </Link>
        }
      />

      {/* Relevant Submodule Options as Navigation Tabs */}
      {submodules.length > 0 && (
        <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar" aria-label="Submodules">
            {submodules.map((sub) => {
              const isActive = activeTab === sub.id
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveTab(sub.id)}
                  className={cn(
                    'px-3.5 py-2.5 text-[13px] sm:text-[14px] font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'border-[#D45060] text-[#D45060] font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  )}
                >
                  {sub.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Module Content Placeholder */}
      <Card className="text-center p-8 sm:p-12 border border-slate-200/80 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#FDF2F4] text-[#D45060] border border-[#F7B5BD]/60 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#D45060]" />
          <span>Submodule: {currentSubmoduleName}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-2">
          {title} • {currentSubmoduleName}
        </h2>

        <p className="text-[14px] sm:text-[15px] text-slate-500 max-w-lg mx-auto mb-6 leading-relaxed">
          The navigation structure for <strong>{title}</strong> and its submodules (
          {submodules.map((s) => s.label).join(', ')}) is ready. Detailed forms, tables, and workflows
          for this module will be developed in an upcoming phase. Currently, the <strong>Dashboard</strong> is
          fully active.
        </p>

        <div className="pt-4 border-t border-slate-100 flex justify-center gap-3">
          <Link to="/">
            <Button
              variant="primary"
              size="md"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default ModulePlaceholder
