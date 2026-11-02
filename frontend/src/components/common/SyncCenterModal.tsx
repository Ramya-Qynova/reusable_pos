import React from 'react'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Database,
  History,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Badge } from './Badge'
import { useOffline } from '../../context/OfflineContext'
import offlineDb from '../../services/offlineDb'
import { useNotification } from '../../context/NotificationContext'

interface SyncCenterModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({ isOpen, onClose }) => {
  const {
    isOnline,
    pendingTransactionsCount,
    lastSuccessfulSync,
    failedSyncCount,
    isSyncing,
    pendingQueue,
    syncLogs,
    triggerSync,
    setSimulatedOffline,
    refreshQueue,
  } = useOffline()

  const { showNotification } = useNotification()

  const handleClearQueue = async () => {
    if (window.confirm('Are you sure you want to discard all pending offline transactions?')) {
      await offlineDb.clearPendingQueue()
      await refreshQueue()
      showNotification({
        title: 'Queue Cleared',
        message: 'All pending offline items have been removed.',
        type: 'info',
      })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Synchronization & Offline Data Center" maxWidth="xl">
      <div className="space-y-6">
        {/* Status Hero Card */}
        <div
          className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isOnline
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                isOnline ? 'bg-emerald-600 shadow-emerald-200' : 'bg-amber-600 shadow-amber-200'
              } shadow-md`}
            >
              {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  {isOnline ? 'System is Online & Connected' : 'System is Operating in Offline Mode'}
                </h3>
                <Badge variant={isOnline ? 'success' : 'warning'}>
                  {isOnline ? 'Connected' : 'Offline'}
                </Badge>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {isOnline
                  ? 'Real-time synchronization with central MySQL backend active.'
                  : 'Transactions are being safely cached in local browser IndexedDB.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulatedOffline(isOnline)}
              className="text-xs"
            >
              {isOnline ? 'Simulate Disconnect' : 'Restore Connection'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={triggerSync}
              disabled={isSyncing || !isOnline}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>

        {/* Sync Summary Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Pending Sync Queue</span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {pendingTransactionsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Saved in local IndexedDB</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Last Full Sync</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-1.5 truncate">
              {lastSuccessfulSync}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Products & customers updated</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Sync Health</span>
              {failedSyncCount === 0 ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {failedSyncCount === 0 ? 'Optimal' : `${failedSyncCount} Failures`}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Idempotency protection enabled</p>
          </div>
        </div>

        {/* Pending Sync Queue List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              Pending Offline Queue ({pendingQueue.length})
            </h4>
            {pendingQueue.length > 0 && (
              <button
                onClick={handleClearQueue}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear Queue
              </button>
            )}
          </div>

          {pendingQueue.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              No pending offline transactions. All actions are synchronized with backend.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {pendingQueue.map((item) => (
                <div key={item.idempotency_key} className="p-3 text-xs flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-800 uppercase tracking-wide">
                      {item.operation_type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px] ml-2">
                      {item.idempotency_key}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Created: {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <Badge variant={item.status === 'failed' ? 'danger' : 'warning'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Synchronization Logs */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            Recent Synchronization Logs
          </h4>
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
            {syncLogs.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No synchronization history recorded yet.</div>
            ) : (
              syncLogs.map((log, i) => (
                <div key={i} className="p-2.5 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                    <span className="text-slate-700">
                      {log.details || `Synced ${log.records_synced} records`}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SyncCenterModal
