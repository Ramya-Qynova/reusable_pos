/**
 * Robust IndexedDB Offline Storage for Reusable POS
 * Works natively in all modern browsers without external dependencies.
 */

export interface PendingSyncRecord {
  id?: number
  idempotency_key: string
  operation_type: 'offline_sale' | 'create_customer' | 'stock_adjustment'
  entity_type: string
  payload: Record<string, unknown>
  created_at: string
  status: 'pending' | 'syncing' | 'failed'
  retries: number
  last_error?: string
}

export interface SyncLogRecord {
  id?: number
  timestamp: string
  status: 'success' | 'failed' | 'partial'
  records_synced: number
  details?: string
}

const DB_NAME = 'ReusablePOS_OfflineDB'
const DB_VERSION = 1

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 1. Cached Products Store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' })
          productStore.createIndex('sku', 'sku', { unique: false })
          productStore.createIndex('barcode', 'barcode', { unique: false })
          productStore.createIndex('name', 'name', { unique: false })
        }

        // 2. Cached Customers Store
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'id' })
          customerStore.createIndex('phone', 'phone', { unique: false })
          customerStore.createIndex('customer_code', 'customer_code', { unique: false })
        }

        // 3. Pending Sync Operations Queue
        if (!db.objectStoreNames.contains('pendingQueue')) {
          const queueStore = db.createObjectStore('pendingQueue', { keyPath: 'id', autoIncrement: true })
          queueStore.createIndex('idempotency_key', 'idempotency_key', { unique: true })
          queueStore.createIndex('status', 'status', { unique: false })
          queueStore.createIndex('created_at', 'created_at', { unique: false })
        }

        // 4. Synchronization History Logs
        if (!db.objectStoreNames.contains('syncLogs')) {
          db.createObjectStore('syncLogs', { keyPath: 'id', autoIncrement: true })
        }

        // 5. System Meta / Last Sync Details
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return this.dbPromise
  }

  // --- PRODUCTS CACHE ---
  async cacheProducts(products: unknown[]): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction('products', 'readwrite')
    const store = tx.objectStore('products')
    store.clear()
    for (const item of products) {
      store.put(item)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getCachedProducts(): Promise<any[]> {
    const db = await this.getDB()
    const tx = db.transaction('products', 'readonly')
    const store = tx.objectStore('products')
    const req = store.getAll()
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  }

  // --- CUSTOMERS CACHE ---
  async cacheCustomers(customers: unknown[]): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction('customers', 'readwrite')
    const store = tx.objectStore('customers')
    store.clear()
    for (const item of customers) {
      store.put(item)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getCachedCustomers(): Promise<any[]> {
    const db = await this.getDB()
    const tx = db.transaction('customers', 'readonly')
    const store = tx.objectStore('customers')
    const req = store.getAll()
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  }

  // --- PENDING QUEUE ---
  async enqueuePending(
    operationType: 'offline_sale' | 'create_customer' | 'stock_adjustment',
    entityType: string,
    payload: Record<string, unknown>
  ): Promise<PendingSyncRecord> {
    const db = await this.getDB()
    const record: PendingSyncRecord = {
      idempotency_key: `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      operation_type: operationType,
      entity_type: entityType,
      payload,
      created_at: new Date().toISOString(),
      status: 'pending',
      retries: 0,
    }

    const tx = db.transaction('pendingQueue', 'readwrite')
    const store = tx.objectStore('pendingQueue')
    const req = store.add(record)

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        record.id = req.result as number
        resolve(record)
      }
      req.onerror = () => reject(req.error)
    })
  }

  async getPendingQueue(): Promise<PendingSyncRecord[]> {
    const db = await this.getDB()
    const tx = db.transaction('pendingQueue', 'readonly')
    const store = tx.objectStore('pendingQueue')
    const req = store.getAll()
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  }

  async removePending(id: number): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction('pendingQueue', 'readwrite')
    const store = tx.objectStore('pendingQueue')
    store.delete(id)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clearPendingQueue(): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction('pendingQueue', 'readwrite')
    tx.objectStore('pendingQueue').clear()
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // --- SYNC LOGS ---
  async logSync(status: 'success' | 'failed' | 'partial', recordsSynced: number, details?: string): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction('syncLogs', 'readwrite')
    const store = tx.objectStore('syncLogs')
    store.add({
      timestamp: new Date().toISOString(),
      status,
      records_synced: recordsSynced,
      details,
    })
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getSyncLogs(): Promise<SyncLogRecord[]> {
    const db = await this.getDB()
    const tx = db.transaction('syncLogs', 'readonly')
    const store = tx.objectStore('syncLogs')
    const req = store.getAll()
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const results = (req.result || []) as SyncLogRecord[]
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        resolve(results.slice(0, 30))
      }
      req.onerror = () => reject(req.error)
    })
  }

  // --- METADATA ---
  async setMeta(key: string, value: unknown): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction('meta', 'readwrite')
    tx.objectStore('meta').put({ key, value })
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getMeta<T = unknown>(key: string): Promise<T | null> {
    const db = await this.getDB()
    const tx = db.transaction('meta', 'readonly')
    const req = tx.objectStore('meta').get(key)
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null)
      req.onerror = () => reject(req.error)
    })
  }
}

export const offlineDb = new OfflineDatabase()
export default offlineDb

