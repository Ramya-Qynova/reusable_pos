import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  Package,
  TrendingUp,
  Receipt,
  Award,
  ArrowRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card } from '../../../components/common/Card'
import { formatCurrency } from '../../../utils/formatters'
import type { ProfitLossSummary, ProfitTrendPoint } from '../../../types/sales'
import { cn } from '../../../utils/cn'

interface ProfitAndLossSectionProps {
  summary: ProfitLossSummary
  trendData: ProfitTrendPoint[]
}

type PeriodFilter = 'today' | 'week' | 'month' | 'custom'

export const ProfitAndLossSection: React.FC<ProfitAndLossSectionProps> = ({
  summary,
  trendData,
}) => {
  const [activeFilter, setActiveFilter] = useState<PeriodFilter>('month')

  const filterOptions: Array<{ id: PeriodFilter; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom Range' },
  ]

  const miniCards = [
    {
      id: 'net_sales',
      title: 'Net Sales',
      value: summary.netSales.value,
      change: summary.netSales.changePercentage,
      isExpense: false,
      icon: <Wallet className="w-4.5 h-4.5 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      id: 'cogs',
      title: 'COGS',
      value: summary.cogs.value,
      change: summary.cogs.changePercentage,
      isExpense: false,
      icon: <Package className="w-4.5 h-4.5 text-[#D45060]" />,
      bg: 'bg-[#FDF2F4] border-[#F7B5BD]',
    },
    {
      id: 'gross_profit',
      title: 'Gross Profit',
      value: summary.grossProfit.value,
      change: summary.grossProfit.changePercentage,
      isExpense: false,
      icon: <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-200',
    },
    {
      id: 'operating_expenses',
      title: 'Operating Expenses',
      value: summary.operatingExpenses.value,
      change: summary.operatingExpenses.changePercentage,
      isExpense: true,
      icon: <Receipt className="w-4.5 h-4.5 text-purple-600" />,
      bg: 'bg-purple-50 border-purple-200',
    },
    {
      id: 'net_profit',
      title: 'Net Profit',
      value: summary.netProfit.value,
      change: summary.netProfit.changePercentage,
      isExpense: false,
      icon: <Award className="w-4.5 h-4.5 text-emerald-700" />,
      bg: 'bg-emerald-50 border-emerald-300',
    },
  ]

  return (
    <Card className="p-5 sm:p-6 shadow-xs">
      {/* Header with Title & Period Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-5">
        <div>
          <h3 className="text-[18px] sm:text-[20px] font-bold text-slate-800 tracking-tight leading-tight">
            Profit & Loss Overview
          </h3>
          <p className="text-[13px] sm:text-[14px] text-slate-500 mt-1">{summary.periodLabel}</p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg gap-1 self-start sm:self-auto">
          {filterOptions.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                'px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all cursor-pointer',
                activeFilter === f.id
                  ? 'bg-[#D45060] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Financial mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {miniCards.map((card) => (
          <div
            key={card.id}
            className="p-3.5 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center border shrink-0',
                  card.bg
                )}
              >
                {card.icon}
              </div>
              <span className="text-[12px] sm:text-[13px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                {card.title}
              </span>
            </div>
            <p className="text-[16px] sm:text-[18px] font-extrabold text-slate-800 tracking-tight">
              {formatCurrency(card.value)}
            </p>
            <p
              className={cn(
                'text-[11px] sm:text-[12px] font-semibold mt-1.5 flex items-center gap-0.5',
                card.isExpense ? 'text-rose-600' : 'text-emerald-600'
              )}
            >
              <span>↑ {card.change}%</span>
              <span className="text-slate-400 font-normal ml-0.5">vs prev</span>
            </p>
          </div>
        ))}
      </div>

      {/* Profit Trend Subheader & Chart */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <h4 className="text-[15px] sm:text-[16px] font-bold text-slate-800">Profit Trend</h4>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[13px] sm:text-[14px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Net Sales
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Gross Profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              Net Profit
            </span>
          </div>
        </div>

        {/* Recharts Chart */}
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trendData}
              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                domain={[0, 80000]}
                ticks={[0, 20000, 40000, 60000, 80000]}
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.toLocaleString('en-IN')}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  padding: '8px 12px',
                }}
                formatter={(val: any, name: any) => [
                  formatCurrency(Number(val)),
                  String(name || ''),
                ]}
              />
              <Bar dataKey="grossProfit" name="Gross Profit" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="netProfit" name="Net Profit" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Line
                type="monotone"
                dataKey="netSales"
                name="Net Sales"
                stroke="#3B82F6"
                strokeWidth={2.8}
                dot={{ r: 4.5, fill: '#3B82F6', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Action Link */}
        <div className="mt-4 pt-3 flex justify-end">
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-semibold text-[#D45060] hover:text-[#BD3E4E] transition-colors group"
          >
            <span>View Detailed P&L Report</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default ProfitAndLossSection
