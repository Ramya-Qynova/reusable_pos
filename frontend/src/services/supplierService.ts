import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { Supplier, SupplierFormData, SupplierPaginationMeta } from '../types/suppliers'

export interface SupplierListResponse {
  data: Supplier[]
  meta?: SupplierPaginationMeta
  message?: string
  success: boolean
}

export const supplierService = {
  async getSuppliers(params?: {
    search?: string
    is_active?: boolean | string
    city?: string
    page?: number
    per_page?: number
    sort_by?: string
    sort_order?: string
  }): Promise<{ items: Supplier[]; meta?: SupplierPaginationMeta }> {
    const response = await apiClient.get<SupplierListResponse>(API_ENDPOINTS.suppliers.list, { params })
    return {
      items: response.data.data || [],
      meta: response.data.meta,
    }
  },

  async getSupplier(id: number | string): Promise<Supplier> {
    const response = await apiClient.get<{ success: boolean; data: Supplier }>(API_ENDPOINTS.suppliers.details(id))
    return response.data.data
  },

  async createSupplier(data: SupplierFormData): Promise<Supplier> {
    const response = await apiClient.post<{ success: boolean; data: Supplier }>(API_ENDPOINTS.suppliers.create, data)
    return response.data.data
  },

  async updateSupplier(id: number | string, data: Partial<SupplierFormData>): Promise<Supplier> {
    const response = await apiClient.put<{ success: boolean; data: Supplier }>(API_ENDPOINTS.suppliers.update(id), data)
    return response.data.data
  },

  async deleteSupplier(id: number | string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.suppliers.delete(id))
  },

  async toggleStatus(id: number | string): Promise<Supplier> {
    const response = await apiClient.post<{ success: boolean; data: Supplier }>(API_ENDPOINTS.suppliers.toggleStatus(id))
    return response.data.data
  },

  async getNextCode(): Promise<string> {
    const response = await apiClient.get<{ success: boolean; data: { next_code: string } }>(API_ENDPOINTS.suppliers.nextCode)
    return response.data.data.next_code
  },
}

export default supplierService

