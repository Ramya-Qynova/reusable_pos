import React, { type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../utils/cn'

export type NotificationVariant = 'info' | 'success' | 'warning' | 'danger'

export interface NotificationBannerProps {
  variant?: NotificationVariant
  title: string
  message?: string
  icon?: ReactNode
  onClose?: () => void
  action?: ReactNode
  className?: string
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  variant = 'info',
  title,
  message,
  icon,
  onClose,
  action,
  className,
}) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
  }[variant]

  const DefaultIcon = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
  }[variant]

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-xl border text-xs',
        styles,
        className
      )}
    >
      <div className="shrink-0 mt-0.5">
        {icon || <DefaultIcon className="w-4 h-4 opacity-80" />}
      </div>
      <div className="flex-1">
        <h5 className="font-semibold">{title}</h5>
        {message && <p className="mt-0.5 opacity-90 leading-relaxed">{message}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-0.5 rounded-md hover:bg-black/5 text-current opacity-70 hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

