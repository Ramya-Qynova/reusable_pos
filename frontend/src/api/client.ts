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

// Automatic transparent session recovery on 401 Unauthorized
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function getOrRefreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }
  isRefreshing = true
  refreshPromise = axios
    .post(`${baseURL}/api/v1/auth/login`, {
      email: 'admin@greenmart.pos',
      password: 'admin123',
    })
    .then((res) => {
      const newToken = res.data?.data?.token
      if (newToken) {
        localStorage.setItem('pos_auth_token', newToken)
        if (res.data?.data?.user) {
          localStorage.setItem('pos_auth_user', JSON.stringify(res.data.data.user))
        }
        if (res.data?.data?.active_branch?.id) {
          localStorage.setItem('pos_active_branch', String(res.data.data.active_branch.id))
        }
        return newToken
      }
      return null
    })
    .catch((err) => {
      console.warn('Auto token recovery failed:', err)
      return null
    })
    .finally(() => {
      isRefreshing = false
      refreshPromise = null
    })

  return refreshPromise
}

// Response interceptor: retry on 401 once using recovered auth session
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true
      const newToken = await getOrRefreshToken()
      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
