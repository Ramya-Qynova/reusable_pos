export interface Brand {
  id: number
  name: string
  code?: string | null
  description?: string | null
  logo_url?: string | null
  is_active: boolean
  products_count?: number
  created_at?: string
  updated_at?: string
}

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
  is_active?: boolean
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
  brand_id?: number | null
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
  mrp?: number
  minimum_stock: number
  has_variants: boolean
  is_active: boolean
  description?: string | null
  image_url?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string

  // Relationships
  category?: Category
  brand?: Brand
  unit?: Unit
  tax_slab?: TaxSlab
  variants?: ProductVariant[]
  branch_prices?: BranchProductPrice[]

  // Effective branch pricing and stock resolved at runtime
  effective_price?: number
  is_branch_override?: boolean
  stock_quantity?: number
  damaged_stock_quantity?: number
}

export interface ProductDashboardStats {
  total_products: number
  active_products: number
  total_categories: number
  total_brands: number
  total_units: number
  low_stock_count: number
  out_of_stock_count: number
}

export interface ProductFilters {
  category_id?: number
  brand_id?: number
  is_active?: boolean
  search?: string
  branch_id?: number
  per_page?: number
}
