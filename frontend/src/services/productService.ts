import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { Category, Product, ProductFilters, TaxSlab, Unit } from '../types/products'

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const productService = {
  // Single consolidated catalog metadata call
  async getMeta(): Promise<{
    categories: Category[]
    units: Unit[]
    tax_slabs: TaxSlab[]
    branches: { id: number; name: string; branch_code: string; location?: string; is_main_branch: boolean }[]
  }> {
    const response = await apiClient.get<ApiResponse<{
      categories: Category[]
      units: Unit[]
      tax_slabs: TaxSlab[]
      branches: { id: number; name: string; branch_code: string; location?: string; is_main_branch: boolean }[]
    }>>(API_ENDPOINTS.products.meta)
    return response.data.data
  },

  // Categories
  async getCategories(tree = false): Promise<Category[]> {
    const url = tree ? API_ENDPOINTS.categories.tree : API_ENDPOINTS.categories.list
    const response = await apiClient.get<ApiResponse<Category[]>>(url)
    return response.data.data
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>(API_ENDPOINTS.categories.create, data)
    return response.data.data
  },

  async updateCategory(id: number | string, data: Partial<Category>): Promise<Category> {
    const response = await apiClient.put<ApiResponse<Category>>(API_ENDPOINTS.categories.update(id), data)
    return response.data.data
  },

  async deleteCategory(id: number | string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.categories.delete(id))
  },

  // Units
  async getUnits(): Promise<Unit[]> {
    const response = await apiClient.get<ApiResponse<Unit[]>>(API_ENDPOINTS.units.list)
    return response.data.data
  },

  async createUnit(data: { name: string; short_code: string; allow_decimals: boolean }): Promise<Unit> {
    const response = await apiClient.post<ApiResponse<Unit>>(API_ENDPOINTS.units.create, data)
    return response.data.data
  },

  async updateUnit(id: number | string, data: { name?: string; short_code?: string; allow_decimals?: boolean }): Promise<Unit> {
    const response = await apiClient.put<ApiResponse<Unit>>(API_ENDPOINTS.units.update(id), data)
    return response.data.data
  },

  async deleteUnit(id: number | string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.units.delete(id))
  },

  // Tax Slabs
  async getTaxSlabs(): Promise<TaxSlab[]> {
    const response = await apiClient.get<ApiResponse<TaxSlab[]>>(API_ENDPOINTS.settings.taxSlabs)
    return response.data.data
  },

  // Branches
  async getBranches(): Promise<{ id: number; name: string; branch_code: string; location?: string; is_main_branch: boolean }[]> {
    const response = await apiClient.get<ApiResponse<{ id: number; name: string; branch_code: string; location?: string; is_main_branch: boolean }[]>>(API_ENDPOINTS.branches.list)
    return response.data.data
  },

  // Products
  async getProducts(filters?: ProductFilters): Promise<{ products: Product[]; total: number }> {
    const response = await apiClient.get<ApiResponse<Product[]>>(API_ENDPOINTS.products.list, {
      params: filters,
    })
    return {
      products: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async getProduct(id: number | string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(API_ENDPOINTS.products.details(id))
    return response.data.data
  },

  async createProduct(data: Record<string, unknown>): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>(API_ENDPOINTS.products.create, data)
    return response.data.data
  },

  async updateProduct(id: number | string, data: Record<string, unknown>): Promise<Product> {
    const response = await apiClient.put<ApiResponse<Product>>(API_ENDPOINTS.products.update(id), data)
    return response.data.data
  },

  async deleteProduct(id: number | string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.products.delete(id))
  },

  async lookupBarcode(barcode: string): Promise<{
    type: 'product' | 'variant'
    product: Product
    variant?: unknown
    selling_price: number
    special_price?: number | null
    is_branch_override: boolean
  }> {
    const response = await apiClient.get<ApiResponse<{
      type: 'product' | 'variant'
      product: Product
      variant?: unknown
      selling_price: number
      special_price?: number | null
      is_branch_override: boolean
    }>>(API_ENDPOINTS.products.barcode(barcode))
    return response.data.data
  },

  async setBranchPrice(
    productId: number | string,
    payload: {
      branch_id: number
      variant_id?: number | null
      selling_price: number
      special_price?: number | null
      is_active?: boolean
    }
  ) {
    const response = await apiClient.post(API_ENDPOINTS.products.branchPrice(productId), payload)
    return response.data.data
  },
}

export default productService
