import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export type NotificationType = 'success' | 'warning' | 'error' | 'info'

export interface AppNotification {
  id: string
  title: string
  message?: string
  type: NotificationType
}

interface NotificationContextType {
  notifications: AppNotification[]
  showNotification: (notification: Omit<AppNotification, 'id'>) => void
  dismissNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const showNotification = useCallback(({ title, message, type }: Omit<AppNotification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    setNotifications((prev) => {
      // Prevent flood of duplicate notices
      const isDuplicate = prev.some((n) => n.title === title && n.message === message)
      if (isDuplicate) return prev
      // Keep max 3 toast notifications visible at once
      const trimmed = prev.length >= 3 ? prev.slice(prev.length - 2) : prev
      return [...trimmed, { id, title, message, type }]
    })

    setTimeout(() => {
      dismissNotification(id)
    }, 4000)
  }, [dismissNotification])

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, dismissNotification }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => {
          const typeStyles = {
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            error: 'bg-rose-50 border-rose-200 text-rose-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800',
          }[n.type]

          const IconComponent = {
            success: CheckCircle2,
            warning: AlertTriangle,
            error: AlertCircle,
            info: Info,
          }[n.type]

          return (
            <div
              key={n.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-2 ${typeStyles}`}
            >
              <IconComponent className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-semibold">{n.title}</p>
                {n.message && <p className="mt-0.5 opacity-90">{n.message}</p>}
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="opacity-60 hover:opacity-100 p-0.5 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
