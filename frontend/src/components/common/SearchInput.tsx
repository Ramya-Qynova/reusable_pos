import React, { type InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  variant?: 'light' | 'navbar'
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  variant = 'light',
  className,
  ...props
}) => {
  const isNavbar = variant === 'navbar'

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        className={cn(
          'absolute left-3 w-4 h-4 pointer-events-none transition-colors',
          isNavbar ? 'text-white/80' : 'text-slate-400'
        )}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-9 pr-8 py-1.5 text-[13px] font-medium rounded-full transition-all focus:outline-none',
          isNavbar
            ? 'bg-white/15 text-white placeholder-white/70 border border-white/20 focus:bg-white/25 focus:ring-1 focus:ring-white/40'
            : 'bg-white text-slate-800 placeholder-slate-400 border border-slate-200 focus:border-[#D45060] focus:ring-2 focus:ring-[#D45060]/20'
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            onClear?.()
          }}
          className={cn(
            'absolute right-2.5 p-0.5 rounded-full hover:opacity-100 transition-opacity',
            isNavbar ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

