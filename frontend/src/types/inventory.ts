import type { Product, ProductVariant } from './products'

export interface BranchStock {
  id: number
  branch_id: number
  product_id: number
  variant_id?: number | null
  quantity: number
  damaged_quantity: number
  reserved_quantity: number
  created_at?: string
  updated_at?: string

  product?: Product
  variant?: ProductVariant
  branch?: {
    id: number
    name: string
    branch_code: string
  }
}

export interface InventoryStats {
  total_valuation_cost: number
  total_valuation_retail: number
  potential_profit: number
  total_stock_units: number
  damaged_units: number
  low_stock_count: number
  out_of_stock_count: number
  total_tracked_products: number
}

export interface BranchStockOverview {
  branch_id: number
  branch_name: string
  branch_code: string
  location?: string
  total_products: number
  total_units: number
  total_valuation_cost: number
  low_stock_items: number
  out_of_stock_items: number
}

export interface StockMovement {
  id: number
  branch_id: number
  product_id: number
  product_variant_id?: number | null
  movement_type: string
  quantity: number
  previous_quantity: number
  new_quantity: number
  unit_cost?: number | null
  reference_type?: string | null
  reference_id?: number | null
  reason?: string | null
  remarks?: string | null
  user_id?: number | null
  created_at: string

  product?: Product
  variant?: ProductVariant
  branch?: {
    id: number
    name: string
    branch_code: string
  }
  user?: {
    id: number
    name: string
  }
}

export interface StockAdjustment {
  id: number
  adjustment_number: string
  branch_id: number
  user_id: number
  reason: string
  type: 'addition' | 'subtraction' | 'damage' | 'physical_count'
  notes?: string | null
  created_at: string
  items?: {
    id: number
    product_id: number
    variant_id?: number | null
    quantity_adjusted: number
    unit_cost: number
    product?: Product
  }[]
  branch?: {
    id: number
    name: string
    branch_code: string
  }
}

export interface StockTransfer {
  id: number
  transfer_number: string
  source_branch_id: number
  destination_branch_id: number
  status: 'draft' | 'dispatched' | 'received' | 'cancelled'
  dispatch_date?: string | null
  receive_date?: string | null
  dispatched_by: number
  received_by?: number | null
  notes?: string | null
  created_at: string

  sourceBranch?: {
    id: number
    name: string
    branch_code: string
  }
  destinationBranch?: {
    id: number
    name: string
    branch_code: string
  }
  dispatchedBy?: {
    id: number
    name: string
  }
  receivedBy?: {
    id: number
    name: string
  }
  items?: {
    id: number
    product_id: number
    variant_id?: number | null
    quantity_sent: number
    quantity_received: number
    notes?: string | null
    product?: Product
  }[]
}

export interface StockBatch {
  id: number
  branch_id: number
  product_id: number
  variant_id?: number | null
  batch_number: string
  manufacturing_date?: string | null
  expiry_date?: string | null
  quantity: number
  cost_price: number
  selling_price: number
  status: 'active' | 'expired' | 'depleted'
  created_at?: string
  product?: Product
  branch?: {
    id: number
    name: string
  }
}

export interface StockValuationItem {
  product_id: number
  product_name: string
  sku: string
  category?: string
  brand?: string
  branch_name?: string
  quantity: number
  unit_cost: number
  unit_selling_price: number
  total_cost_valuation: number
  total_retail_valuation: number
  profit_margin_amount: number
  margin_percentage: number
}

export interface StockValuationReport {
  total_cost_valuation: number
  total_retail_valuation: number
  total_projected_profit: number
  items: StockValuationItem[]
}

