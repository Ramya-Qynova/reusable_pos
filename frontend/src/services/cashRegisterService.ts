import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { CashMovement, CashRegisterShift, SalesPaginationMeta } from '../types/sales'

export interface ShiftListResponse {
  data: CashRegisterShift[]
  meta?: SalesPaginationMeta
  message?: string
  success: boolean
}

export const cashRegisterService = {
  async getCurrentShift(): Promise<CashRegisterShift | null> {
    const response = await apiClient.get<{ success: boolean; data: CashRegisterShift | null }>(
      API_ENDPOINTS.cashRegisters.current
    )
    return response.data.data
  },

  async openShift(openingBalance: number, notes?: string): Promise<CashRegisterShift> {
    const response = await apiClient.post<{ success: boolean; data: CashRegisterShift }>(
      API_ENDPOINTS.cashRegisters.open,
      {
        opening_balance: openingBalance,
        notes,
      }
    )
    return response.data.data
  },

  async closeShift(actualClosingBalance: number, notes?: string): Promise<CashRegisterShift> {
    const response = await apiClient.post<{ success: boolean; data: CashRegisterShift }>(
      API_ENDPOINTS.cashRegisters.close,
      {
        actual_closing_balance: actualClosingBalance,
        notes,
      }
    )
    return response.data.data
  },

  async recordMovement(type: 'cash_in' | 'cash_out', amount: number, reason: string): Promise<CashMovement> {
    const response = await apiClient.post<{ success: boolean; data: CashMovement }>(
      API_ENDPOINTS.cashRegisters.movement,
      {
        type,
        amount,
        reason,
      }
    )
    return response.data.data
  },

  async getShifts(params?: { user_id?: number | string; page?: number; per_page?: number }): Promise<{
    items: CashRegisterShift[]
    meta?: SalesPaginationMeta
  }> {
    const response = await apiClient.get<ShiftListResponse>(API_ENDPOINTS.cashRegisters.shifts, { params })
    return {
      items: response.data.data || [],
      meta: response.data.meta,
    }
  },
}

export default cashRegisterService
