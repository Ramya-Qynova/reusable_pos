import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'

export interface AuthUser {
  id: number
  name: string
  email: string
  is_super_admin: boolean
  role?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  activeRole: 'admin' | 'cashier'
  login: (email: string, password?: string) => Promise<boolean>
  loginWithPin: (pinCode: string) => Promise<boolean>
  logout: () => void
  switchDemoRole: (role: 'admin' | 'cashier') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('pos_auth_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pos_auth_token'))
  const [activeRole, setActiveRole] = useState<'admin' | 'cashier'>(() => {
    return (localStorage.getItem('pos_demo_role') as 'admin' | 'cashier') || 'admin'
  })
  const [isLoading, setIsLoading] = useState(true)

  // Verify existing session without hardcoded auto-login
  const verifySession = useCallback(async () => {
    try {
      const existingToken = localStorage.getItem('pos_auth_token')
      if (existingToken) {
        try {
          const meResp = await apiClient.get(API_ENDPOINTS.auth.me)
          if (meResp.data?.data?.user) {
            setUser(meResp.data.data.user)
            setIsLoading(false)
            return
          }
        } catch (error: any) {
          // Token expired or invalid (401 Unauthorized)
          if (error?.response?.status === 401) {
            localStorage.removeItem('pos_auth_token')
            localStorage.removeItem('pos_auth_user')
            setToken(null)
            setUser(null)
          } else {
            // Backend offline or network error: preserve cached offline/PWA credentials and defer
            throw error
          }
        }
      }
    } catch (err) {
      console.warn('Session verification deferred until backend is reachable:', err)
      // Retry in 2 seconds if backend was offline
      setTimeout(() => {
        if (localStorage.getItem('pos_auth_token')) {
          verifySession()
        }
      }, 2000)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    verifySession()

    const handleAuthExpired = () => {
      setToken(null)
      setUser(null)
    }

    window.addEventListener('auth:expired', handleAuthExpired)
    return () => window.removeEventListener('auth:expired', handleAuthExpired)
  }, [verifySession])

  // Login with Email & Password
  const login = async (email: string, password = 'admin123'): Promise<boolean> => {
    try {
      setIsLoading(true)
      const resp = await apiClient.post(API_ENDPOINTS.auth.login, { email, password })
      if (resp.data?.data?.token) {
        const newToken = resp.data.data.token
        const newUser = resp.data.data.user
        const activeBranch = resp.data.data.active_branch

        localStorage.setItem('pos_auth_token', newToken)
        localStorage.setItem('pos_auth_user', JSON.stringify(newUser))
        if (activeBranch?.id) {
          localStorage.setItem('pos_active_branch', String(activeBranch.id))
        }

        setToken(newToken)
        setUser(newUser)
        setActiveRole(newUser.is_super_admin ? 'admin' : 'cashier')
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Login with PIN Code
  const loginWithPin = async (pinCode: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const resp = await apiClient.post(API_ENDPOINTS.auth.login, { pin_code: pinCode })
      if (resp.data?.data?.token) {
        const newToken = resp.data.data.token
        const newUser = resp.data.data.user
        const activeBranch = resp.data.data.active_branch

        localStorage.setItem('pos_auth_token', newToken)
        localStorage.setItem('pos_auth_user', JSON.stringify(newUser))
        if (activeBranch?.id) {
          localStorage.setItem('pos_active_branch', String(activeBranch.id))
        }

        setToken(newToken)
        setUser(newUser)
        setActiveRole(newUser.is_super_admin ? 'admin' : 'cashier')
        return true
      }
      return false
    } catch (error) {
      console.error('PIN Login failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Switch Role between Admin (full control) and Cashier (view only, no catalog.manage)
  const switchDemoRole = async (role: 'admin' | 'cashier') => {
    if (role === 'admin') {
      await login('admin@greenmart.pos', 'admin123')
      setActiveRole('admin')
      localStorage.setItem('pos_demo_role', 'admin')
    } else {
      await loginWithPin('5678') // Cashier PIN
      setActiveRole('cashier')
      localStorage.setItem('pos_demo_role', 'cashier')
    }
  }

  const logout = () => {
    localStorage.removeItem('pos_auth_token')
    localStorage.removeItem('pos_auth_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        activeRole,
        login,
        loginWithPin,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
