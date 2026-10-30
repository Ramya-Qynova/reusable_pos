import React, { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export const Table: React.FC<HTMLAttributes<HTMLTableElement>> = ({ className, ...props }) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full text-left text-[13px] text-slate-600', className)} {...props} />
  </div>
)

export const TableHeader: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <thead
    className={cn('bg-slate-50/90 text-[12px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80', className)}
    {...props}
  />
)

export const TableBody: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => <tbody className={cn('divide-y divide-slate-100 bg-white', className)} {...props} />

export const TableRow: React.FC<HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => (
  <tr
    className={cn('hover:bg-slate-50/70 transition-colors', className)}
    {...props}
  />
)

export const TableHead: React.FC<ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <th className={cn('px-3 sm:px-4 py-2 sm:py-2.5 font-semibold tracking-wider text-slate-600 text-[12px] sm:text-[12.5px]', className)} {...props} />
)

export const TableCell: React.FC<TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => <td className={cn('px-3 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap text-slate-700 text-[13px]', className)} {...props} />

export default Table
