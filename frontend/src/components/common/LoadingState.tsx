import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface LoadingStateProps {
  message?: string
  submessage?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  submessage,
  className,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center animate-in fade-in',
        className
      )}
    >
      <Loader2 className={cn('animate-spin text-[#D45060]', iconSizes)} />
      {message && <p className="mt-3 text-xs sm:text-sm font-medium text-slate-700">{message}</p>}
      {submessage && <p className="mt-1 text-xs text-slate-400">{submessage}</p>}
    </div>
  )
}

