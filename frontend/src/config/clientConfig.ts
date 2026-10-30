import type { ClientProfile } from '../types/business'

/**
 * Active Client Deployment Profile
 * For independent client deployment with multi-branch support per client.
 * In production, this can be loaded from an environment config file,
 * local storage, or a deployment metadata endpoint.
 */
export const DEFAULT_CLIENT_PROFILE: ClientProfile = {
  id: 'client_green_mart_001',
  clientName: 'Green Mart Supermarket',
  branchName: 'Main Branch',
  businessType: 'supermarket',
  currency: '₹',
  currencyCode: 'INR',
  timezone: 'Asia/Kolkata',
  taxIdentificationNumber: 'GSTIN33AABCG1234F1Z5',
  address: '124, Commercial Road, Central Market',
  phone: '+91 98765 43210',
  email: 'manager@greenmart.pos',
  enabledModules: [
    'dashboard',
    'sales',
    'products',
    'inventory',
    'customers',
    'suppliers',
    'payments',
    'reports',
    'users',
    'offline',
    'settings',
  ],
}

