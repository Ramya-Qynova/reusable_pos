import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { Customer, CustomerFormData, CustomerGroup, CustomerPaginationMeta, CustomerStats } from '../types/customers'

export interface CustomerListResponse {
  data: Customer[]
  meta?: CustomerPaginationMeta
  message?: string
  success: boolean
}

export const customerService = {
  async getDashboardStats(): Promise<CustomerStats> {
    const response = await apiClient.get<{ success: boolean; data: CustomerStats }>(API_ENDPOINTS.customers.stats)
    return response.data.data
  },

  async getCustomers(params?: {
    search?: string
    is_active?: boolean | string
    customer_group_id?: number | string
    customer_type?: string
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

  async getCustomer(id: number | string): Promise<any> {
    const response = await apiClient.get<{ success: boolean; data: any }>(API_ENDPOINTS.customers.details(id))
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

  async getGroups(): Promise<CustomerGroup[]> {
    const response = await apiClient.get<{ success: boolean; data: CustomerGroup[] }>(API_ENDPOINTS.customers.groups)
    return response.data.data
  },

  async createGroup(data: Partial<CustomerGroup>): Promise<CustomerGroup> {
    const response = await apiClient.post<{ success: boolean; data: CustomerGroup }>(API_ENDPOINTS.customers.createGroup, data)
    return response.data.data
  },

  async updateGroup(id: number | string, data: Partial<CustomerGroup>): Promise<CustomerGroup> {
    const response = await apiClient.put<{ success: boolean; data: CustomerGroup }>(API_ENDPOINTS.customers.updateGroup(id), data)
    return response.data.data
  },

  async deleteGroup(id: number | string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.customers.deleteGroup(id))
  },

  async recordCreditPayment(customerId: number | string, data: { amount: number; payment_date?: string; payment_method?: string; notes?: string }): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(API_ENDPOINTS.customers.creditPayment(customerId), data)
    return response.data.data
  },

  async bulkImport(customers: unknown[]): Promise<{ imported_count: number; failed_count: number; errors: string[] }> {
    const response = await apiClient.post<{ success: boolean; data: { imported_count: number; failed_count: number; errors: string[] } }>(
      API_ENDPOINTS.customers.import,
      { customers }
    )
    return response.data.data
  },

  async bulkExport(): Promise<unknown[]> {
    const response = await apiClient.get<{ success: boolean; data: unknown[] }>(API_ENDPOINTS.customers.export)
    return response.data.data
  },
}

export default customerService
