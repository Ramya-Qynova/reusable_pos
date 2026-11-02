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

/* =========================================================
   Phase 6: POS Billing, Sales Orders & Cash Register Types
   ========================================================= */

export interface CartItem {
  product_id: number
  product_variant_id?: number | null
  product_name: string
  variant_name?: string | null
  sku: string
  barcode?: string | null
  unit_name: string
  allow_decimals: boolean
  quantity: number
  unit_price: number
  discount_type?: 'fixed' | 'percentage' | null
  discount_rate?: number
  discount_amount: number
  tax_rate: number
  is_tax_inclusive: boolean
  tax_amount: number
  cgst_amount: number
  sgst_amount: number
  subtotal: number
  total: number
}

export interface SalesOrderItem {
  id: number
  sales_order_id: number
  product_id: number
  product_variant_id?: number | null
  product_name: string
  variant_name?: string | null
  sku?: string | null
  barcode?: string | null
  quantity: number
  unit_price: number
  discount_type?: 'fixed' | 'percentage' | null
  discount_rate?: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  is_tax_inclusive: boolean
  subtotal: number
  total: number
  product?: {
    id: number
    name: string
    unit?: { id: number; name: string; short_code: string; allow_decimals: boolean }
  }
}

export interface SalesPaymentRecord {
  id: number
  sales_order_id: number
  branch_id: number
  user_id: number
  cash_register_shift_id?: number | null
  payment_method: 'cash' | 'card' | 'upi' | 'other'
  amount: number
  payment_reference?: string | null
  status: string
  payment_date: string
  notes?: string | null
}

export interface SalesOrder {
  id: number
  branch_id: number
  user_id: number
  customer_id?: number | null
  cash_register_shift_id?: number | null
  invoice_number: string
  order_date: string
  status: 'completed' | 'pending' | 'cancelled'
  payment_status: 'paid' | 'partial' | 'unpaid'
  is_gst_bill: boolean
  subtotal: number
  discount_type?: 'fixed' | 'percentage' | null
  discount_rate?: number | null
  discount_amount: number
  tax_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  round_off: number
  grand_total: number
  paid_amount: number
  change_amount: number
  notes?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  customer?: {
    id: number
    customer_code: string
    name: string
    phone: string
    email?: string | null
    address?: string | null
  } | null
  user?: {
    id: number
    name: string
    email: string
  }
  branch?: {
    id: number
    name: string
    branch_code: string
    address?: string | null
    phone?: string | null
  }
  items: SalesOrderItem[]
  payments: SalesPaymentRecord[]
}

export interface CashMovement {
  id: number
  cash_register_shift_id: number
  branch_id: number
  user_id: number
  type: 'cash_in' | 'cash_out'
  amount: number
  reason: string
  created_at: string
}

export interface CashRegisterShift {
  id: number
  branch_id: number
  user_id: number
  opened_at: string
  closed_at?: string | null
  opening_balance: number
  cash_sales_amount: number
  cash_in_amount: number
  cash_out_amount: number
  expected_closing_balance?: number | null
  expected_balance?: number | null
  actual_closing_balance?: number | null
  difference?: number | null
  status: 'open' | 'closed'
  opening_notes?: string | null
  closing_notes?: string | null
  user?: {
    id: number
    name: string
    email: string
  }
  movements?: CashMovement[]
}

export interface SalesPaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface CreateSalePayload {
  customer_id?: number | null
  is_gst_bill?: boolean
  enable_rounding?: boolean
  discount_type?: 'fixed' | 'percentage' | null
  discount_rate?: number
  discount_amount?: number
  notes?: string | null
  items: {
    product_id: number
    product_variant_id?: number | null
    quantity: number
    discount_type?: 'fixed' | 'percentage' | null
    discount_rate?: number
    discount_amount?: number
  }[]
  payments: {
    payment_method: string
    amount: number
    payment_reference?: string | null
  }[]
}
