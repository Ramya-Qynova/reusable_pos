import React, { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3',
        className
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        {icon && (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FDF2F4] text-[#D45060] flex items-center justify-center shrink-0 border border-[#F7B5BD]/60 shadow-2xs">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-slate-800 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] sm:text-[14px] text-slate-500 font-normal mt-0.5 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}

export default PageHeader
