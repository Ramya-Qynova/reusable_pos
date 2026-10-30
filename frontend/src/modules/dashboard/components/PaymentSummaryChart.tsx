import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { Card } from '../../../components/common/Card'
import { formatCurrency } from '../../../utils/formatters'
import type { PaymentMethodBreakdown } from '../../../types/sales'

interface PaymentSummaryChartProps {
  data: PaymentMethodBreakdown[]
  totalSales: number
}

export const PaymentSummaryChart: React.FC<PaymentSummaryChartProps> = ({
  data,
  totalSales,
}) => {
  return (
    <Card className="p-3.5 sm:p-4 h-full flex flex-col justify-between shadow-xs">
      <div>
        <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-800 mb-2 sm:mb-2.5 tracking-tight leading-tight">
          Payment Summary
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
          {/* Donut Chart with Center Text */}
          <div className="relative w-38 h-38 sm:w-42 sm:h-42 shrink-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="amount"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    padding: '6px 10px',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Hole Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[15px] sm:text-[17px] font-extrabold text-slate-800 tracking-tight leading-tight">
                {formatCurrency(totalSales)}
              </span>
              <span className="text-[10px] sm:text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Total Sales
              </span>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="flex-1 w-full space-y-1.5 sm:space-y-2">
            {data.map((item) => (
              <div
                key={item.method}
                className="flex items-center justify-between text-[12.5px] sm:text-[13px] py-1 border-b border-slate-100 last:border-none"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-slate-700">{item.method}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-slate-800">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="text-[11.5px] font-semibold text-slate-400 min-w-8 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default PaymentSummaryChart
