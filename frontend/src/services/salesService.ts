import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { CreateSalePayload, SalesOrder, SalesPaginationMeta } from '../types/sales'

export interface SalesListResponse {
  data: SalesOrder[]
  meta?: SalesPaginationMeta
  message?: string
  success: boolean
}

export interface SalesSummaryResponse {
  total_sales_count: number
  total_revenue: number
  total_tax: number
  total_discount: number
  payment_breakdown: {
    cash: number
    upi: number
    card: number
    other: number
  }
}

export const salesService = {
  async getSales(params?: {
    search?: string
    customer_id?: number | string
    payment_status?: string
    status?: string
    from_date?: string
    to_date?: string
    page?: number
    per_page?: number
  }): Promise<{ items: SalesOrder[]; meta?: SalesPaginationMeta }> {
    const response = await apiClient.get<SalesListResponse>(API_ENDPOINTS.sales.list, { params })
    return {
      items: response.data.data || [],
      meta: response.data.meta,
    }
  },

  async getSale(id: number | string): Promise<SalesOrder> {
    const response = await apiClient.get<{ success: boolean; data: SalesOrder }>(API_ENDPOINTS.sales.details(id))
    return response.data.data
  },

  async createSale(payload: CreateSalePayload): Promise<SalesOrder> {
    const response = await apiClient.post<{ success: boolean; data: SalesOrder }>(API_ENDPOINTS.sales.create, payload)
    return response.data.data
  },

  async getSummary(params?: { from_date?: string; to_date?: string }): Promise<SalesSummaryResponse> {
    const response = await apiClient.get<{ success: boolean; data: SalesSummaryResponse }>(API_ENDPOINTS.sales.summary, { params })
    return response.data.data
  },
}

export default salesService
