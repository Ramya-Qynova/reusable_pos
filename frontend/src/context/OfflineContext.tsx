import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { OfflineStatusInfo } from '../types/sales'

interface OfflineContextType extends OfflineStatusInfo {
  isSyncing: boolean
  triggerSync: () => Promise<void>
  setSimulatedOffline: (status: boolean) => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState<number>(3)
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string>('29 Oct 2026, 09:45 AM')
  const [failedSyncCount, setFailedSyncCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Real browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const triggerSync = async (): Promise<void> => {
    if (isSyncing) return
    setIsSyncing(true)
    
    // Demonstrate UI feedback for Phase 1 (no fake backend calls)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    
    const now = new Date()
    const formattedDate = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const formattedTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

    setLastSuccessfulSync(`${formattedDate}, ${formattedTime}`)
    setPendingTransactionsCount(0)
    setFailedSyncCount(0)
    setIsSyncing(false)
  }

  const setSimulatedOffline = (status: boolean) => {
    setIsOnline(!status)
  }

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingTransactionsCount,
        lastSuccessfulSync,
        failedSyncCount,
        isSyncing,
        triggerSync,
        setSimulatedOffline,
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider')
  }
  return context
}

