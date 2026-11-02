import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import offlineDb, { type PendingSyncRecord } from './offlineDb'

export interface SyncStatusResponse {
  online: boolean
  server_timestamp: string
  branch_id: number
  pending_server_jobs: number
}

export interface SyncPushResult {
  processed_count: number
  failed_count: number
  processed: { idempotency_key: string; status: string; entity_id?: number; invoice_number?: string }[]
  failed: { idempotency_key: string; error: string }[]
}

export const syncService = {
  /**
   * Heartbeat to check if backend is reachable
   */
  async checkStatus(): Promise<boolean> {
    try {
      const res = await apiClient.get<{ success: boolean; data: SyncStatusResponse }>(
        API_ENDPOINTS.sync.status,
        { timeout: 4000 }
      )
      return res.data?.success && res.data?.data?.online
    } catch {
      return false
    }
  },

  /**
   * Pull delta records and cache them into IndexedDB
   */
  async pullData(): Promise<{ productsCount: number; customersCount: number }> {
    const lastSync = await offlineDb.getMeta<string>('last_sync_timestamp')
    const response = await apiClient.get<{
      success: boolean
      data: {
        products: unknown[]
        customers: unknown[]
        categories: unknown[]
        units: unknown[]
        tax_slabs: unknown[]
        pulled_at: string
      }
    }>(API_ENDPOINTS.sync.pull, {
      params: lastSync ? { since: lastSync } : {},
    })

    const data = response.data.data
    if (data.products && data.products.length > 0) {
      await offlineDb.cacheProducts(data.products)
    }
    if (data.customers && data.customers.length > 0) {
      await offlineDb.cacheCustomers(data.customers)
    }

    await offlineDb.setMeta('last_sync_timestamp', data.pulled_at)
    return {
      productsCount: data.products?.length || 0,
      customersCount: data.customers?.length || 0,
    }
  },

  /**
   * Push all pending offline transactions to server with idempotency keys
   */
  async pushPending(): Promise<SyncPushResult> {
    const queue: PendingSyncRecord[] = await offlineDb.getPendingQueue()
    if (queue.length === 0) {
      return { processed_count: 0, failed_count: 0, processed: [], failed: [] }
    }

    try {
      const response = await apiClient.post<{ success: boolean; data: SyncPushResult }>(
        API_ENDPOINTS.sync.push,
        { transactions: queue }
      )

      const result = response.data.data

      // Remove successfully processed items from IndexedDB queue
      for (const item of result.processed) {
        const matching = queue.find((q) => q.idempotency_key === item.idempotency_key)
        if (matching && matching.id) {
          await offlineDb.removePending(matching.id)
        }
      }

      await offlineDb.logSync(
        result.failed_count === 0 ? 'success' : 'partial',
        result.processed_count,
        `Processed: ${result.processed_count}, Failed: ${result.failed_count}`
      )

      return result
    } catch (err) {
      await offlineDb.logSync('failed', 0, (err as Error).message)
      throw err
    }
  },

  /**
   * Full two-way synchronization: push pending then pull updates
   */
  async performFullSync(): Promise<{ pushed: number; pulled: number }> {
    const pushRes = await this.pushPending()
    const pullRes = await this.pullData()
    return {
      pushed: pushRes.processed_count,
      pulled: pullRes.productsCount + pullRes.customersCount,
    }
  },
}

export default syncService

