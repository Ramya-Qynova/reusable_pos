export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Online'

export type SaleStatus = 'Completed' | 'Pending' | 'Cancelled' | 'Refunded'

export interface RecentSale {
  id: string
  invoiceNumber: string
  customerName: string
  customerCategory?: string
  amount: number
  paymentMethod: PaymentMethod
  timestamp: string
  status: SaleStatus
}

export type StockStatus = 'Low' | 'Critical' | 'In Stock'

export interface LowStockItem {
  id: string
  productName: string
  category: string
  currentStock: number
  minimumStock: number
  unit: string
  status: StockStatus
  sku: string
}

export interface KPICardData {
  id: string
  title: string
  value: string | number
  unitPrefix?: string
  changePercentage: number
  changeLabel: string
  trend: 'up' | 'down' | 'neutral'
  sparklineData: number[]
  colorScheme: 'pink' | 'emerald' | 'purple' | 'amber'
}

export interface ProfitLossSummary {
  periodLabel: string
  netSales: {
    value: number
    changePercentage: number
  }
  cogs: {
    value: number
    changePercentage: number
  }
  grossProfit: {
    value: number
    changePercentage: number
  }
  operatingExpenses: {
    value: number
    changePercentage: number
  }
  netProfit: {
    value: number
    changePercentage: number
  }
}

export interface ProfitTrendPoint {
  date: string
  label: string
  netSales: number
  grossProfit: number
  netProfit: number
  cogs: number
}

export interface SalesOverviewPoint {
  date: string
  label: string
  salesAmount: number
  orders: number
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod
  amount: number
  percentage: number
  color: string
}

export interface OfflineStatusInfo {
  isOnline: boolean
  pendingTransactionsCount: number
  lastSuccessfulSync: string
  failedSyncCount: number
}

