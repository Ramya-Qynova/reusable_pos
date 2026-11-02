import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type {
  BranchStock,
  BranchStockOverview,
  InventoryStats,
  StockAdjustment,
  StockBatch,
  StockMovement,
  StockTransfer,
  StockValuationReport,
} from '../types/inventory'

export interface InventoryListParams {
  category_id?: number | string
  stock_status?: 'all' | 'in_stock' | 'low' | 'out' | 'damaged'
  search?: string
  page?: number
  per_page?: number
}

export const inventoryService = {
  async getDashboardStats(): Promise<InventoryStats> {
    const response = await apiClient.get<{ success: boolean; data: InventoryStats }>(API_ENDPOINTS.inventory.stats)
    return response.data.data
  },

  async getOverview(): Promise<BranchStockOverview[]> {
    const response = await apiClient.get<{ success: boolean; data: BranchStockOverview[] }>(API_ENDPOINTS.inventory.overview)
    return response.data.data
  },

  async getStocks(params?: InventoryListParams): Promise<{ items: BranchStock[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: BranchStock[]
      meta?: { total: number }
    }>(API_ENDPOINTS.inventory.list, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async recordStockIn(payload: {
    branch_id: number
    product_id: number
    variant_id?: number | null
    quantity: number
    unit_cost?: number
    reason?: string
    remarks?: string
  }): Promise<BranchStock> {
    const response = await apiClient.post<{ success: boolean; data: BranchStock }>(
      API_ENDPOINTS.inventory.stockIn,
      payload
    )
    return response.data.data
  },

  async recordStockOut(payload: {
    branch_id: number
    product_id: number
    variant_id?: number | null
    quantity: number
    reason?: string
    remarks?: string
  }): Promise<BranchStock> {
    const response = await apiClient.post<{ success: boolean; data: BranchStock }>(
      API_ENDPOINTS.inventory.stockOut,
      payload
    )
    return response.data.data
  },

  async recordAdjustment(payload: {
    branch_id: number
    reason: string
    type: 'addition' | 'subtraction' | 'damage' | 'physical_count'
    notes?: string
    items: { product_id: number; variant_id?: number | null; quantity_adjusted: number; unit_cost?: number }[]
  }): Promise<StockAdjustment> {
    const response = await apiClient.post<{ success: boolean; data: StockAdjustment }>(
      API_ENDPOINTS.inventory.adjust,
      payload
    )
    return response.data.data
  },

  async getTransfers(params?: { status?: string; page?: number }): Promise<{ items: StockTransfer[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: StockTransfer[]
      meta?: { total: number }
    }>(API_ENDPOINTS.inventory.transfers, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async createTransfer(payload: {
    source_branch_id: number
    destination_branch_id: number
    notes?: string
    items: { product_id: number; variant_id?: number | null; quantity_sent: number; notes?: string }[]
  }): Promise<StockTransfer> {
    const response = await apiClient.post<{ success: boolean; data: StockTransfer }>(
      API_ENDPOINTS.inventory.createTransfer,
      payload
    )
    return response.data.data
  },

  async receiveTransfer(transferId: number | string): Promise<StockTransfer> {
    const response = await apiClient.post<{ success: boolean; data: StockTransfer }>(
      API_ENDPOINTS.inventory.receiveTransfer(transferId)
    )
    return response.data.data
  },

  async getMovements(params?: {
    product_id?: number
    movement_type?: string
    from_date?: string
    to_date?: string
    page?: number
    per_page?: number
  }): Promise<{ items: StockMovement[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: StockMovement[]
      meta?: { total: number }
    }>(API_ENDPOINTS.inventory.movements, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async getValuation(): Promise<StockValuationReport> {
    const response = await apiClient.get<{ success: boolean; data: StockValuationReport }>(
      API_ENDPOINTS.inventory.valuation
    )
    return response.data.data
  },

  async getBatches(params?: { search?: string; page?: number }): Promise<{ items: StockBatch[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: StockBatch[]
      meta?: { total: number }
    }>(API_ENDPOINTS.inventory.batches, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async storeBatch(payload: {
    branch_id: number
    product_id: number
    batch_number: string
    manufacturing_date?: string
    expiry_date?: string
    quantity: number
    cost_price?: number
    selling_price?: number
  }): Promise<StockBatch> {
    const response = await apiClient.post<{ success: boolean; data: StockBatch }>(
      API_ENDPOINTS.inventory.storeBatch,
      payload
    )
    return response.data.data
  },
}

export default inventoryService

