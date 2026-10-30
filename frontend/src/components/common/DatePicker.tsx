import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  options?: Array<{ label: string; value: string }>
  className?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  options = [
    { label: '29 Oct 2026 (Today)', value: 'today' },
    { label: '28 Oct 2026 (Yesterday)', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'This Month (Oct 2026)', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Custom Date Range...', value: 'custom' },
  ],
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] sm:text-[13px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#D45060]/20 cursor-pointer"
      >
        <Calendar className="w-4 h-4 text-slate-500" />
        <span>{selectedOption.label}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-30 animate-in fade-in-50 zoom-in-95">
          <div className="px-3.5 py-2 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select Timeframe
            </p>
          </div>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between px-3.5 py-2 text-[13px] transition-colors text-left cursor-pointer',
                opt.value === selectedOption.value
                  ? 'bg-[#FDF2F4] text-[#D45060] font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <span>{opt.label}</span>
              {opt.value === selectedOption.value && (
                <Check className="w-4 h-4 text-[#D45060]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

