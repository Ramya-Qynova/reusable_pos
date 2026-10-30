import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Receipt,
  PackagePlus,
  UserPlus,
  Truck,
  ArrowUpRight,
  Zap,
} from 'lucide-react'
import { Card } from '../../../components/common/Card'
import { cn } from '../../../utils/cn'

interface QuickActionItem {
  id: string
  label: string
  hint: string
  path: string
  icon: React.ReactNode
  bg: string
  border: string
  iconBg: string
  isPrimary?: boolean
}

export const QuickActionsSection: React.FC = () => {
  const navigate = useNavigate()

  const actions: QuickActionItem[] = [
    {
      id: 'new_bill',
      label: 'New Bill',
      hint: 'Fast counter POS sale',
      path: '/sales',
      icon: <Receipt className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      bg: 'bg-[#FDF2F4]/80 hover:bg-[#FCE7EA]',
      border: 'border-[#F7B5BD] hover:border-[#D45060]',
      iconBg: 'bg-[#D45060] text-white shadow-2xs',
      isPrimary: true,
    },
    {
      id: 'add_product',
      label: 'Add Product',
      hint: 'Create new SKU & pricing',
      path: '/products',
      icon: <PackagePlus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      bg: 'bg-emerald-50/70 hover:bg-emerald-100/70',
      border: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-600 text-white shadow-2xs',
    },
    {
      id: 'add_customer',
      label: 'Add Customer',
      hint: 'Enroll buyer profile & loyalty',
      path: '/customers',
      icon: <UserPlus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      bg: 'bg-purple-50/70 hover:bg-purple-100/70',
      border: 'border-purple-200 hover:border-purple-300',
      iconBg: 'bg-purple-600 text-white shadow-2xs',
    },
    {
      id: 'purchase_entry',
      label: 'Purchase Entry',
      hint: 'Record supplier invoice & GRN',
      path: '/purchases',
      icon: <Truck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />,
      bg: 'bg-amber-50/70 hover:bg-amber-100/70',
      border: 'border-amber-200 hover:border-amber-300',
      iconBg: 'bg-amber-600 text-white shadow-2xs',
    },
  ]

  return (
    <Card className="p-3 sm:p-3.5 shadow-xs border-slate-200/90">
      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#FDF2F4] flex items-center justify-center text-[#D45060] shrink-0">
            <Zap className="w-3.5 h-3.5 fill-[#D45060]" />
          </div>
          <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-800 tracking-tight leading-tight">
            Quick Actions
          </h2>
          <span className="hidden sm:inline-block text-[12px] text-slate-400 font-normal">
            • Immediate shortcuts for counter billing, catalog, and inventory
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={() => navigate(act.path)}
            className={cn(
              'group relative flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-lg border transition-all duration-150 text-left cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#D45060]/30',
              act.bg,
              act.border
            )}
          >
            <div
              className={cn(
                'w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                act.iconBg
              )}
            >
              {act.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] sm:text-[14px] font-bold text-slate-800 group-hover:text-slate-900 leading-tight truncate">
                  {act.label}
                </span>
                {act.isPrimary && (
                  <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded-xs bg-[#D45060] text-white tracking-wider shrink-0">
                    POS
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-[11.5px] text-slate-500 font-medium block truncate mt-0.5">
                {act.hint}
              </span>
            </div>

            <div className="w-5 h-5 rounded flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}

export default QuickActionsSection
