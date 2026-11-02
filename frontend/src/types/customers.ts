export interface CustomerGroup {
  id: number
  name: string
  code: string
  discount_percentage: number
  credit_limit: number
  description?: string | null
  is_active: boolean
  customers_count?: number
  created_at?: string
  updated_at?: string
}

export interface CustomerLedgerEntry {
  id: number
  customer_id: number
  branch_id?: number | null
  transaction_type: 'opening_balance' | 'sale' | 'payment' | 'return' | 'credit_adjustment'
  reference_type?: string | null
  reference_id?: number | null
  transaction_date: string
  debit: number
  credit: number
  running_balance: number
  notes?: string | null
  created_at: string
}

export interface CustomerLoyaltyEntry {
  id: number
  customer_id: number
  sales_order_id?: number | null
  type: 'earned' | 'redeemed' | 'expired' | 'adjustment'
  points: number
  conversion_amount: number
  notes?: string | null
  created_at: string
}

export interface Customer {
  id: number
  customer_code: string
  customer_group_id?: number | null
  customer_type?: string
  name: string
  phone: string
  alternate_phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  tax_number?: string | null
  credit_limit: number
  opening_balance: number
  current_balance: number
  loyalty_points: number
  notes?: string | null
  is_active: boolean
  created_at: string
  updated_at: string

  group?: CustomerGroup
  ledgers?: CustomerLedgerEntry[]
}

export interface CustomerFormData {
  customer_code?: string
  customer_group_id?: number | string | null
  customer_type?: string
  name: string
  phone: string
  alternate_phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  tax_number?: string
  credit_limit?: number | string
  opening_balance?: number | string
  notes?: string
  is_active: boolean
}

export interface CustomerStats {
  total_customers: number
  active_customers: number
  total_credit_receivable: number
  total_loyalty_points: number
  total_groups: number
  customers_with_credit: number
}

export interface CustomerPaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}
