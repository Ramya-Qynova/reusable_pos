export type BusinessVertical =
  | 'supermarket'
  | 'vegetable_fruit'
  | 'clothing_textile'
  | 'jewellery'
  | 'general_retail'
  | 'wholesale_distribution'
  | 'restaurant'

export interface BusinessVerticalConfig {
  id: BusinessVertical
  name: string
  description: string
  iconName: string
  features: {
    weightScaleBilling: boolean
    perishableStock: boolean
    batchAndExpiry: boolean
    sizeColorVariants: boolean
    jewelleryPurityAndMakingCharges: boolean
    tableManagement: boolean
    kitchenOrderTicket: boolean
    barcodeScanning: boolean
    wholesaleTiers: boolean
    serialNumberTracking: boolean
  }
}

export type ModuleId =
  | 'dashboard'
  | 'sales'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'purchases'
  | 'suppliers'
  | 'finance'
  | 'payments'
  | 'reports'
  | 'users'
  | 'offline'
  | 'settings'

export interface ClientProfile {
  id: string
  clientName: string
  branchName: string
  businessType: BusinessVertical
  currency: string
  currencyCode: string
  timezone: string
  taxIdentificationNumber?: string
  address: string
  phone: string
  email: string
  enabledModules: ModuleId[]
}

