import type { Product, ProductVariant } from './products'
import type { Supplier } from './suppliers'

export interface PurchaseStats {
  total_purchases_amount: number
  total_paid_amount: number
  total_outstanding_payable: number
  total_orders_count: number
  open_orders_count: number
  pending_grns_count: number
  suppliers_count: number
}

export interface PurchaseOrderItem {
  id: number
  purchase_order_id: number
  product_id: number
  variant_id?: number | null
  ordered_quantity: number
  received_quantity: number
  unit_cost: number
  discount_rate: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number

  product?: Product
  variant?: ProductVariant
}

export interface PurchaseOrder {
  id: number
  po_number: string
  branch_id: number
  supplier_id: number
  user_id: number
  order_date: string
  expected_delivery_date?: string | null
  status: 'draft' | 'pending' | 'partially_received' | 'received' | 'cancelled'
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes?: string | null
  created_at: string

  supplier?: Supplier
  branch?: {
    id: number
    name: string
    branch_code: string
  }
  user?: {
    id: number
    name: string
  }
  items?: PurchaseOrderItem[]
  goodsReceipts?: GoodsReceiptNote[]
  invoices?: PurchaseInvoice[]
}

export interface GoodsReceiptItem {
  id: number
  goods_receipt_note_id: number
  purchase_order_item_id?: number | null
  product_id: number
  variant_id?: number | null
  received_quantity: number
  accepted_quantity: number
  damaged_quantity: number
  rejected_quantity: number
  unit_cost: number
  batch_number?: string | null
  expiry_date?: string | null

  product?: Product
}

export interface GoodsReceiptNote {
  id: number
  grn_number: string
  purchase_order_id?: number | null
  branch_id: number
  supplier_id: number
  received_by: number
  receipt_date: string
  status: 'completed' | 'cancelled'
  supplier_invoice_number?: string | null
  supplier_invoice_date?: string | null
  remarks?: string | null
  created_at: string

  supplier?: Supplier
  branch?: {
    id: number
    name: string
  }
  receivedBy?: {
    id: number
    name: string
  }
  purchaseOrder?: {
    id: number
    po_number: string
  }
  items?: GoodsReceiptItem[]
}

export interface PurchaseInvoice {
  id: number
  invoice_number: string
  purchase_order_id?: number | null
  goods_receipt_note_id?: number | null
  branch_id: number
  supplier_id: number
  invoice_date: string
  due_date?: string | null
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  payment_status: 'unpaid' | 'partially_paid' | 'paid'
  notes?: string | null
  created_at: string

  supplier?: Supplier
  branch?: {
    id: number
    name: string
  }
  purchaseOrder?: {
    id: number
    po_number: string
  }
  payments?: PurchasePayment[]
}

export interface PurchasePayment {
  id: number
  payment_number: string
  purchase_invoice_id: number
  supplier_id: number
  branch_id: number
  user_id: number
  payment_date: string
  amount: number
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'upi'
  transaction_reference?: string | null
  notes?: string | null
  created_at: string

  supplier?: Supplier
  invoice?: PurchaseInvoice
  user?: {
    id: number
    name: string
  }
}

export interface PurchaseReturn {
  id: number
  return_number: string
  purchase_invoice_id?: number | null
  supplier_id: number
  branch_id: number
  user_id: number
  return_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  reason?: string | null
  status: string
  created_at: string

  supplier?: Supplier
  branch?: {
    id: number
    name: string
  }
  items?: {
    id: number
    product_id: number
    quantity: number
    unit_cost: number
    tax_rate: number
    total_amount: number
    product?: Product
  }[]
}

export interface SupplierLedgerEntry {
  id: number
  supplier_id: number
  branch_id?: number | null
  transaction_type: 'opening_balance' | 'purchase_invoice' | 'payment' | 'return' | 'adjustment'
  reference_type?: string | null
  reference_id?: number | null
  transaction_date: string
  debit: number
  credit: number
  running_balance: number
  description?: string | null
  created_at: string
}

export interface SupplierLedgerReport {
  supplier: Supplier
  total_invoiced: number
  total_paid: number
  current_balance: number
  ledger: SupplierLedgerEntry[]
}

