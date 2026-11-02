import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type {
  GoodsReceiptNote,
  PurchaseInvoice,
  PurchaseOrder,
  PurchasePayment,
  PurchaseReturn,
  PurchaseStats,
  SupplierLedgerReport,
} from '../types/purchases'

export const purchaseService = {
  async getDashboardStats(): Promise<PurchaseStats> {
    const response = await apiClient.get<{ success: boolean; data: PurchaseStats }>(API_ENDPOINTS.purchases.stats)
    return response.data.data
  },

  async getOrders(params?: {
    supplier_id?: number
    status?: string
    from_date?: string
    to_date?: string
    search?: string
    page?: number
    per_page?: number
  }): Promise<{ items: PurchaseOrder[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: PurchaseOrder[]
      meta?: { total: number }
    }>(API_ENDPOINTS.purchases.orders, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async getOrder(id: number | string): Promise<PurchaseOrder> {
    const response = await apiClient.get<{ success: boolean; data: PurchaseOrder }>(
      API_ENDPOINTS.purchases.orderDetails(id)
    )
    return response.data.data
  },

  async createOrder(payload: {
    branch_id: number
    supplier_id: number
    order_date?: string
    expected_delivery_date?: string
    notes?: string
    items: {
      product_id: number
      variant_id?: number | null
      ordered_quantity: number
      unit_cost: number
      discount_rate?: number
      tax_rate?: number
    }[]
  }): Promise<PurchaseOrder> {
    const response = await apiClient.post<{ success: boolean; data: PurchaseOrder }>(
      API_ENDPOINTS.purchases.createOrder,
      payload
    )
    return response.data.data
  },

  async getGoodsReceipts(params?: { page?: number; per_page?: number }): Promise<{ items: GoodsReceiptNote[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: GoodsReceiptNote[]
      meta?: { total: number }
    }>(API_ENDPOINTS.purchases.goodsReceipts, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async recordGoodsReceipt(payload: {
    branch_id: number
    supplier_id: number
    purchase_order_id?: number | null
    supplier_invoice_number?: string
    supplier_invoice_date?: string
    remarks?: string
    items: {
      purchase_order_item_id?: number | null
      product_id: number
      variant_id?: number | null
      received_quantity: number
      accepted_quantity: number
      damaged_quantity?: number
      rejected_quantity?: number
      unit_cost: number
      batch_number?: string
      expiry_date?: string
    }[]
  }): Promise<GoodsReceiptNote> {
    const response = await apiClient.post<{ success: boolean; data: GoodsReceiptNote }>(
      API_ENDPOINTS.purchases.createGoodsReceipt,
      payload
    )
    return response.data.data
  },

  async getInvoices(params?: { payment_status?: string; page?: number; per_page?: number }): Promise<{ items: PurchaseInvoice[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: PurchaseInvoice[]
      meta?: { total: number }
    }>(API_ENDPOINTS.purchases.invoices, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async getPayments(params?: { page?: number; per_page?: number }): Promise<{ items: PurchasePayment[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: PurchasePayment[]
      meta?: { total: number }
    }>(API_ENDPOINTS.purchases.payments, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async recordPayment(payload: {
    purchase_invoice_id: number
    amount: number
    payment_date?: string
    payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'upi'
    transaction_reference?: string
    notes?: string
  }): Promise<PurchasePayment> {
    const response = await apiClient.post<{ success: boolean; data: PurchasePayment }>(
      API_ENDPOINTS.purchases.createPayment,
      payload
    )
    return response.data.data
  },

  async getReturns(params?: { page?: number; per_page?: number }): Promise<{ items: PurchaseReturn[]; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: PurchaseReturn[]
      meta?: { total: number }
    }>(API_ENDPOINTS.purchases.returns, { params })

    return {
      items: response.data.data,
      total: response.data.meta?.total ?? response.data.data.length,
    }
  },

  async recordReturn(payload: {
    supplier_id: number
    branch_id: number
    purchase_invoice_id?: number | null
    reason: string
    return_date?: string
    items: {
      product_id: number
      variant_id?: number | null
      quantity: number
      unit_cost: number
      tax_rate?: number
    }[]
  }): Promise<PurchaseReturn> {
    const response = await apiClient.post<{ success: boolean; data: PurchaseReturn }>(
      API_ENDPOINTS.purchases.createReturn,
      payload
    )
    return response.data.data
  },

  async getSupplierLedger(supplierId: number | string): Promise<SupplierLedgerReport> {
    const response = await apiClient.get<{ success: boolean; data: SupplierLedgerReport }>(
      API_ENDPOINTS.purchases.supplierLedger(supplierId)
    )
    return response.data.data
  },
}

export default purchaseService
