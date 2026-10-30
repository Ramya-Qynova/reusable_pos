/**
 * Centralized API endpoints for Laravel backend integration
 */
export const API_ENDPOINTS = {
  auth: {
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    me: '/api/v1/auth/me',
  },
  settings: {
    profile: '/api/v1/settings/profile',
    features: '/api/v1/settings/features',
    taxSlabs: '/api/v1/settings/tax-slabs',
  },
  branches: {
    list: '/api/v1/branches',
    current: '/api/v1/branches/current',
  },
  categories: {
    list: '/api/v1/categories',
    tree: '/api/v1/categories?tree=true',
    create: '/api/v1/categories',
    details: (id: number | string) => `/api/v1/categories/${id}`,
    update: (id: number | string) => `/api/v1/categories/${id}`,
    delete: (id: number | string) => `/api/v1/categories/${id}`,
  },
  units: {
    list: '/api/v1/units',
    create: '/api/v1/units',
    details: (id: number | string) => `/api/v1/units/${id}`,
    update: (id: number | string) => `/api/v1/units/${id}`,
    delete: (id: number | string) => `/api/v1/units/${id}`,
  },
  products: {
    meta: '/api/v1/products/meta',
    list: '/api/v1/products',
    create: '/api/v1/products',
    details: (id: number | string) => `/api/v1/products/${id}`,
    update: (id: number | string) => `/api/v1/products/${id}`,
    delete: (id: number | string) => `/api/v1/products/${id}`,
    barcode: (code: string) => `/api/v1/products/barcode/${encodeURIComponent(code)}`,
    branchPrice: (productId: number | string) => `/api/v1/products/${productId}/branch-price`,
  },
  dashboard: {
    kpis: '/api/v1/dashboard/kpis',
    profitLoss: '/api/v1/dashboard/profit-loss',
    salesOverview: '/api/v1/dashboard/sales-overview',
    paymentSummary: '/api/v1/dashboard/payment-summary',
    recentSales: '/api/v1/dashboard/recent-sales',
    lowStock: '/api/v1/dashboard/low-stock-alerts',
  },
  sales: {
    list: '/api/v1/sales',
    create: '/api/v1/sales',
    details: (id: string) => `/api/v1/sales/${id}`,
  },
  inventory: {
    status: '/api/v1/inventory/status',
    adjust: '/api/v1/inventory/adjust',
  },
  customers: {
    list: '/api/v1/customers',
    create: '/api/v1/customers',
  },
  suppliers: {
    list: '/api/v1/suppliers',
    purchases: '/api/v1/purchases',
  },
  sync: {
    push: '/api/v1/sync/push',
    pull: '/api/v1/sync/pull',
    status: '/api/v1/sync/status',
  },
} as const
