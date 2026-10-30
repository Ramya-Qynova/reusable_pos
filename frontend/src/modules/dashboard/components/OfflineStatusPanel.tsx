import React from 'react'
import {
  CloudOff,
  CloudCheck,
  Clock,
  RefreshCw,
  AlertTriangle,
  RotateCw,
} from 'lucide-react'
import { useOffline } from '../../../context/OfflineContext'
import { useNotification } from '../../../context/NotificationContext'
import { Button } from '../../../components/common/Button'
import { cn } from '../../../utils/cn'

export const OfflineStatusPanel: React.FC = () => {
  const {
    pendingTransactionsCount,
    lastSuccessfulSync,
    failedSyncCount,
    isSyncing,
    triggerSync,
  } = useOffline()
  const { showNotification } = useNotification()

  const handleSync = async () => {
    try {
      await triggerSync()
      showNotification({
        title: 'Synchronization Complete',
        message: 'Pending queue synchronized with server. (Phase 1 UI demonstration)',
        type: 'success',
      })
    } catch {
      showNotification({
        title: 'Sync Failed',
        message: 'Unable to reach backend gateway.',
        type: 'error',
      })
    }
  }

  return (
    <div
      className={cn(
        'w-full rounded-xl border p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 sm:gap-4 transition-all shadow-xs',
        pendingTransactionsCount > 0
          ? 'bg-[#FDF2F4]/80 border-[#F7B5BD]'
          : 'bg-emerald-50/70 border-emerald-200'
      )}
    >
      {/* Left: Mode status */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className={cn(
            'w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs text-white',
            pendingTransactionsCount > 0
              ? 'bg-[#D45060]'
              : 'bg-emerald-600'
          )}
        >
          {pendingTransactionsCount > 0 ? (
            <CloudOff className="w-4.5 h-4.5" />
          ) : (
            <CloudCheck className="w-4.5 h-4.5" />
          )}
        </div>
        <div>
          <h3 className="text-[15px] sm:text-[16px] font-bold text-slate-800 leading-tight">
            {pendingTransactionsCount > 0 ? 'Offline Mode Active' : 'Online & Synchronized'}
          </h3>
          <p className="text-[12px] sm:text-[12.5px] text-slate-600 mt-0.5">
            {pendingTransactionsCount > 0
              ? `Working offline without network interruptions. ${pendingTransactionsCount} transactions queued for sync.`
              : 'All offline sales transactions are fully synced with central database.'}
          </p>
        </div>
      </div>

      {/* Middle: Metrics */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <span className="text-[10px] sm:text-[10.5px] text-slate-400 block uppercase font-medium">Pending Queue</span>
            <span className="font-extrabold text-slate-800 text-[13px] sm:text-[14px]">{pendingTransactionsCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <RotateCw className="w-4 h-4 text-slate-400" />
          <div>
            <span className="text-[10px] sm:text-[10.5px] text-slate-400 block uppercase font-medium">Last Sync</span>
            <span className="font-semibold text-slate-700 text-[12.5px] sm:text-[13px]">{lastSuccessfulSync}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <AlertTriangle
            className={cn(
              'w-4 h-4',
              failedSyncCount > 0 ? 'text-rose-500' : 'text-slate-400'
            )}
          />
          <div>
            <span className="text-[10px] sm:text-[10.5px] text-slate-400 block uppercase font-medium">Failed Records</span>
            <span
              className={cn(
                'font-bold text-[12.5px] sm:text-[13px]',
                failedSyncCount > 0 ? 'text-rose-600' : 'text-slate-700'
              )}
            >
              {failedSyncCount}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Sync Action Button */}
      <div className="shrink-0">
        <Button
          variant="primary"
          size="sm"
          isLoading={isSyncing}
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />}
          onClick={handleSync}
          className="shadow-2xs font-semibold text-[12.5px] sm:text-[13px] px-3 py-1.5"
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>
    </div>
  )
}

export default OfflineStatusPanel
