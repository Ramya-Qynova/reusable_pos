export interface Category {
  id: number
  parent_id?: number | null
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  is_active: boolean
  parent?: Category | null
  children?: Category[]
  created_at?: string
  updated_at?: string
}

export interface Unit {
  id: number
  name: string
  short_code: string
  allow_decimals: boolean
  created_at?: string
  updated_at?: string
}

export interface TaxSlab {
  id: number
  name: string
  rate: number
  cgst_rate?: number
  sgst_rate?: number
  igst_rate?: number
}

export interface ProductVariant {
  id: number
  product_id: number
  variant_sku: string
  variant_barcode?: string | null
  attributes_json: Record<string, string | number>
  cost_price?: number | null
  selling_price: number
  created_at?: string
  updated_at?: string
}

export interface BranchProductPrice {
  id: number
  branch_id: number
  product_id: number
  variant_id?: number | null
  selling_price: number
  special_price?: number | null
  is_active: boolean
}

export interface Product {
  id: number
  category_id: number
  unit_id: number
  tax_slab_id?: number | null
  name: string
  sku: string
  barcode?: string | null
  hsn_code?: string | null
  tax_rate?: number
  is_tax_inclusive: boolean
  cost_price: number
  selling_price: number
  minimum_stock: number
  has_variants: boolean
  is_active: boolean
  metadata?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string

  // Relationships
  category?: Category
  unit?: Unit
  tax_slab?: TaxSlab
  variants?: ProductVariant[]
  branch_prices?: BranchProductPrice[]

  // Effective branch pricing resolved at runtime
  effective_price?: number
  is_branch_override?: boolean
}

export interface ProductFilters {
  category_id?: number
  is_active?: boolean
  search?: string
  branch_id?: number
  per_page?: number
}

