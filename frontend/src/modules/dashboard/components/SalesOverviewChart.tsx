import React, { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { ChevronDown } from 'lucide-react'
import { Card } from '../../../components/common/Card'
import { formatCurrency } from '../../../utils/formatters'
import type { SalesOverviewPoint } from '../../../types/sales'

interface SalesOverviewChartProps {
  data: SalesOverviewPoint[]
}

export const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({ data }) => {
  const [timeframe, setTimeframe] = useState<'7days' | '14days' | '30days'>('7days')

  return (
    <Card className="p-3.5 sm:p-4 h-full flex flex-col justify-between shadow-xs">
      <div>
        {/* Header & Filter */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
          <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-800 tracking-tight leading-tight">
            Sales Overview
          </h2>

          <div className="relative inline-block">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-[12px] sm:text-[12.5px] font-medium rounded-lg px-2.5 py-1 pr-6.5 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#D45060]"
            >
              <option value="7days">Last 7 Days</option>
              <option value="14days">Last 14 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 sm:gap-4 text-[12px] sm:text-[12.5px] text-slate-600 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Sales Amount
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Orders
          </span>
        </div>

        {/* Bar Chart */}
        <div className="h-52 sm:h-56 w-full pt-0.5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 10, left: -14, bottom: 2 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 30]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  padding: '6px 10px',
                }}
                formatter={(val: any, name: any) => {
                  const label = String(name || '')
                  const formattedVal =
                    label === 'Sales Amount'
                      ? formatCurrency(Number(val))
                      : `${val} orders`
                  return [formattedVal, label]
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="salesAmount"
                name="Sales Amount"
                fill="#3B82F6"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                yAxisId="right"
                dataKey="orders"
                name="Orders"
                fill="#10B981"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}

export default SalesOverviewChart
