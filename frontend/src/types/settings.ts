export interface BusinessProfileData {
  id?: number
  client_name: string
  legal_name?: string | null
  tax_id?: string | null
  currency_code?: string | null
  currency_symbol?: string | null
  timezone?: string | null
  business_type?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

export interface AppSettingMap {
  general?: {
    store_name?: string
    timezone?: string
    date_format?: string
    allow_negative_stock?: boolean
    [key: string]: unknown
  }
  currency?: {
    currency_symbol?: string
    currency_code?: string
    decimal_places?: number
    [key: string]: unknown
  }
  invoice?: {
    invoice_prefix?: string
    header_note?: string
    footer_note?: string
    show_qr_code?: boolean
    print_thermal_copies?: number
    [key: string]: unknown
  }
  printer?: {
    printer_type?: string
    auto_cut_paper?: boolean
    open_drawer_on_sale?: boolean
    [key: string]: unknown
  }
  barcode?: {
    symbology?: string
    barcode_prefix?: string
    show_price_on_label?: boolean
    [key: string]: unknown
  }
  notification?: {
    low_stock_threshold_alert?: number
    email_daily_summary?: boolean
    [key: string]: unknown
  }
  sync?: {
    auto_sync_interval_mins?: number
    conflict_resolution?: string
    [key: string]: unknown
  }
  [group: string]: Record<string, unknown> | undefined
}

export interface StaffUser {
  id: number
  name: string
  email: string
  is_super_admin: boolean
  is_active: boolean
  created_at?: string
  branch_roles?: {
    branch?: string
    branch_id: number
    role?: string
    role_id: number
  }[]
}

export interface PermissionItem {
  id: number
  slug: string
  module: string
  description?: string
}

export interface RoleItem {
  id: number
  name: string
  slug: string
  description?: string
  is_system?: boolean
  permissions: PermissionItem[]
}

export interface SystemHealthData {
  app_environment: string
  php_version: string
  laravel_version: string
  database_connection: string
  record_counts: Record<string, number>
  server_time: string
  last_backup: string
}

