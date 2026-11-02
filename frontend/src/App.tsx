import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from './context/ConfigContext'
import { NotificationProvider } from './context/NotificationContext'
import { AuthProvider } from './context/AuthContext'
import { OfflineProvider } from './context/OfflineContext'
import { AppRoutes } from './routes/AppRoutes'

// TanStack Query client setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider>
          <NotificationProvider>
            <AuthProvider>
              <OfflineProvider>
                <AppRoutes />
              </OfflineProvider>
            </AuthProvider>
          </NotificationProvider>
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
