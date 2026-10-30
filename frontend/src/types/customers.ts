export interface Customer {
  id: number
  customer_code: string
  name: string
  phone: string
  alternate_phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  tax_number?: string | null
  notes?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  customer_code?: string
  name: string
  phone: string
  alternate_phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  tax_number?: string
  notes?: string
  is_active: boolean
}

export interface CustomerPaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

