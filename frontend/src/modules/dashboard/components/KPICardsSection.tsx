import React from 'react'
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import type { KPICardData } from '../../../types/sales'
import { Card } from '../../../components/common/Card'
import { cn } from '../../../utils/cn'

interface KPICardsSectionProps {
  cards: KPICardData[]
  title?: string
  subtitle?: string
}

// Crisp, lightweight SVG Sparkline
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 68
  const height = 22

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 6) - 3
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export const KPICardsSection: React.FC<KPICardsSectionProps> = ({
  cards,
  title = "Today's Summary",
  subtitle = "Key performance indicators and sales metrics for today",
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'todays_sales':
      case 'total_sales':
        return <IndianRupee className="w-4.5 h-4.5 text-[#D45060]" />
      case 'todays_orders':
      case 'total_orders':
        return <ShoppingBag className="w-4.5 h-4.5 text-emerald-600" />
      case 'low_stock_items':
        return <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
      case 'pending_payments':
        return <Clock className="w-4.5 h-4.5 text-purple-600" />
      case 'total_products':
        return <Package className="w-4.5 h-4.5 text-purple-600" />
      case 'total_customers':
        return <Users className="w-4.5 h-4.5 text-amber-600" />
      default:
        return <IndianRupee className="w-4.5 h-4.5 text-[#D45060]" />
    }
  }

  const getSchemeStyles = (scheme: KPICardData['colorScheme']) => {
    switch (scheme) {
      case 'pink':
        return {
          bgIcon: 'bg-[#FDF2F4] border-[#F7B5BD]',
          sparkColor: '#D45060',
        }
      case 'emerald':
        return {
          bgIcon: 'bg-emerald-50 border-emerald-200',
          sparkColor: '#10B981',
        }
      case 'purple':
        return {
          bgIcon: 'bg-purple-50 border-purple-200',
          sparkColor: '#8B5CF6',
        }
      case 'amber':
        return {
          bgIcon: 'bg-amber-50 border-amber-200',
          sparkColor: '#F59E0B',
        }
    }
  }

  return (
    <div className="space-y-2 sm:space-y-2.5">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-800 tracking-tight leading-tight">
              {title}
            </h2>
            {subtitle && (
              <span className="hidden sm:inline-block text-[12px] text-slate-400 font-normal">
                • {subtitle}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {cards.map((card) => {
          const { bgIcon, sparkColor } = getSchemeStyles(card.colorScheme)

          return (
            <Card key={card.id} className="relative p-3 sm:p-3.5 overflow-hidden shadow-xs hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                {/* Left: Icon & Label */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border shrink-0 shadow-2xs',
                      bgIcon
                    )}
                  >
                    {getIcon(card.id)}
                  </div>
                  <div>
                    <p className="text-[12.5px] sm:text-[13px] font-semibold text-slate-500 uppercase tracking-wide leading-none">
                      {card.title}
                    </p>
                    <p className="text-[24px] sm:text-[25px] font-extrabold text-slate-800 tracking-tight leading-none mt-1.5">
                      {card.unitPrefix ? `${card.unitPrefix} ` : ''}
                      {card.value}
                    </p>
                  </div>
                </div>

                {/* Right: Sparkline */}
                <div className="hidden sm:block shrink-0 pt-1">
                  <Sparkline data={card.sparklineData} color={sparkColor} />
                </div>
              </div>

              {/* Bottom: Trend percentage & label */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11.5px] sm:text-[12px]">
                <div className="flex items-center gap-1 font-semibold">
                  {card.trend === 'up' && (
                    <span className="text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{card.changePercentage}%
                    </span>
                  )}
                  {card.trend === 'down' && (
                    <span className="text-rose-600 flex items-center gap-0.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      -{card.changePercentage}%
                    </span>
                  )}
                  {card.trend === 'neutral' && (
                    <span className="text-purple-600 flex items-center gap-0.5">
                      <Minus className="w-3.5 h-3.5" />
                      {card.changePercentage}%
                    </span>
                  )}
                  <span className="text-slate-400 font-normal ml-1">
                    {card.changeLabel}
                  </span>
                </div>

                {/* Sparkline on mobile fallback */}
                <div className="sm:hidden">
                  <Sparkline data={card.sparklineData} color={sparkColor} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default KPICardsSection
