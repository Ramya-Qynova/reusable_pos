import axios, { type AxiosInstance } from 'axios'

/**
 * Enterprise Axios HTTP Client
 * Configured for Laravel API backend with Sanctum token management.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Request interceptor: attach bearer token and client branch ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pos_auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const branchId = localStorage.getItem('pos_active_branch') || '1'
    if (branchId && config.headers && !config.headers['X-Branch-ID']) {
      config.headers['X-Branch-ID'] = branchId
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 Unauthorized securely without hardcoded credentials
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('pos_auth_token')
      localStorage.removeItem('pos_auth_user')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
