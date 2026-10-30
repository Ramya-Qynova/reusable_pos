import React, { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hoverable?: boolean
  noPadding?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  noPadding = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-[#EAEFF5] rounded-xl shadow-xs transition-all duration-200',
        hoverable && 'hover:shadow-md hover:border-slate-300/80 cursor-pointer',
        !noPadding && 'p-3.5 sm:p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-3', className)}>
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-800 tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 font-normal">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

