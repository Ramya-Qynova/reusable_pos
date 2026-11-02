import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { OfflineStatusInfo } from '../types/sales'
import offlineDb, { type PendingSyncRecord, type SyncLogRecord } from '../services/offlineDb'
import syncService from '../services/syncService'
import { useNotification } from './NotificationContext'

interface OfflineContextType extends OfflineStatusInfo {
  isSyncing: boolean
  pendingQueue: PendingSyncRecord[]
  syncLogs: SyncLogRecord[]
  triggerSync: () => Promise<void>
  setSimulatedOffline: (status: boolean) => void
  refreshQueue: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showNotification } = useNotification()
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false)
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState<number>(0)
  const [pendingQueue, setPendingQueue] = useState<PendingSyncRecord[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLogRecord[]>([])
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string>('Never')
  const [failedSyncCount, setFailedSyncCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Load initial IndexedDB queue and sync metadata
  const refreshQueue = useCallback(async () => {
    try {
      const queue = await offlineDb.getPendingQueue()
      const logs = await offlineDb.getSyncLogs()
      const lastSync = await offlineDb.getMeta<string>('last_sync_timestamp')

      setPendingQueue(queue)
      setPendingTransactionsCount(queue.length)
      setSyncLogs(logs)

      if (lastSync) {
        const d = new Date(lastSync)
        setLastSuccessfulSync(
          d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        )
      }

      const recentFails = logs.filter((l) => l.status === 'failed').length
      setFailedSyncCount(recentFails)
    } catch (e) {
      console.warn('Could not read IndexedDB offline queue:', e)
    }
  }, [])

  // Listen to browser network changes and perform periodic health check
  useEffect(() => {
    const handleOnline = async () => {
      if (!isSimulatedOffline) {
        const actuallyOnline = await syncService.checkStatus()
        setIsOnline(actuallyOnline)
        if (actuallyOnline) {
          showNotification({
            title: 'Internet Restored',
            message: 'Connection re-established. Ready to synchronize data.',
            type: 'success',
          })
          // Auto sync when coming back online
          triggerSync()
        }
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      showNotification({
        title: 'Offline Mode Activated',
        message: 'No internet detected. Transactions will be saved locally in IndexedDB.',
        type: 'warning',
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    refreshQueue()

    // Heartbeat check every 30 seconds
    const interval = setInterval(async () => {
      if (!isSimulatedOffline) {
        const alive = await syncService.checkStatus()
        setIsOnline(alive)
      }
      refreshQueue()
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [isSimulatedOffline, refreshQueue, showNotification])

  const triggerSync = async (): Promise<void> => {
    if (isSyncing) return
    setIsSyncing(true)

    try {
      showNotification({
        title: 'Synchronizing...',
        message: 'Pushed pending transactions and fetching updated catalogue.',
        type: 'info',
      })

      const res = await syncService.performFullSync()
      await refreshQueue()

      const now = new Date()
      const formatted = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      setLastSuccessfulSync(formatted)

      showNotification({
        title: 'Sync Complete',
        message: `Successfully synchronized! ${res.pushed} transactions uploaded, ${res.pulled} records refreshed.`,
        type: 'success',
      })
    } catch (err) {
      console.error('Synchronization failed:', err)
      showNotification({
        title: 'Sync Failed',
        message: (err as Error).message || 'Failed to complete synchronization with server.',
        type: 'error',
      })
    } finally {
      setIsSyncing(false)
      refreshQueue()
    }
  }

  const setSimulatedOffline = (offline: boolean) => {
    setIsSimulatedOffline(offline)
    setIsOnline(!offline)
    showNotification({
      title: offline ? 'Simulated Offline Mode' : 'Online Mode Resumed',
      message: offline
        ? 'Network connectivity has been manually disconnected for offline testing.'
        : 'Network connectivity manually re-enabled.',
      type: offline ? 'warning' : 'success',
    })
  }

  return (
    <OfflineContext.Provider
      value={{
        isOnline: isSimulatedOffline ? false : isOnline,
        pendingTransactionsCount,
        lastSuccessfulSync,
        failedSyncCount,
        isSyncing,
        pendingQueue,
        syncLogs,
        triggerSync,
        setSimulatedOffline,
        refreshQueue,
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
