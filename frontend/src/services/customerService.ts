import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { Customer, CustomerFormData, CustomerPaginationMeta } from '../types/customers'

export interface CustomerListResponse {
  data: Customer[]
  meta?: CustomerPaginationMeta
  message?: string
  success: boolean
}

export const customerService = {
  async getCustomers(params?: {
    search?: string
    is_active?: boolean | string
    city?: string
    page?: number
    per_page?: number
    sort_by?: string
    sort_order?: string
  }): Promise<{ items: Customer[]; meta?: CustomerPaginationMeta }> {
    const response = await apiClient.get<CustomerListResponse>(API_ENDPOINTS.customers.list, { params })
    return {
      items: response.data.data || [],
      meta: response.data.meta,
    }
  },

  async getCustomer(id: number | string): Promise<Customer> {
    const response = await apiClient.get<{ success: boolean; data: Customer }>(API_ENDPOINTS.customers.details(id))
    return response.data.data
  },

  async createCustomer(data: CustomerFormData): Promise<Customer> {
    const response = await apiClient.post<{ success: boolean; data: Customer }>(API_ENDPOINTS.customers.create, data)
    return response.data.data
  },

  async updateCustomer(id: number | string, data: Partial<CustomerFormData>): Promise<Customer> {
    const response = await apiClient.put<{ success: boolean; data: Customer }>(API_ENDPOINTS.customers.update(id), data)
    return response.data.data
  },

  async deleteCustomer(id: number | string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.customers.delete(id))
  },

  async toggleStatus(id: number | string): Promise<Customer> {
    const response = await apiClient.post<{ success: boolean; data: Customer }>(API_ENDPOINTS.customers.toggleStatus(id))
    return response.data.data
  },

  async getNextCode(): Promise<string> {
    const response = await apiClient.get<{ success: boolean; data: { next_code: string } }>(API_ENDPOINTS.customers.nextCode)
    return response.data.data.next_code
  },
}

export default customerService

