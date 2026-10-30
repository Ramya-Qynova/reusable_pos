import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { DEFAULT_CLIENT_PROFILE } from '../config/clientConfig'
import { BUSINESS_VERTICALS } from '../config/businessTypes'
import type { BusinessVertical, BusinessVerticalConfig, ClientProfile, ModuleId } from '../types/business'

interface ConfigContextType {
  client: ClientProfile
  verticalConfig: BusinessVerticalConfig
  allVerticals: Record<BusinessVertical, BusinessVerticalConfig>
  setBusinessVertical: (vertical: BusinessVertical) => void
  isModuleEnabled: (moduleId: ModuleId) => boolean
  isFeatureEnabled: (featureKey: keyof BusinessVerticalConfig['features']) => boolean
  updateBranch: (branchName: string) => void
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<ClientProfile>(() => {
    const saved = localStorage.getItem('pos_client_profile')
    return saved ? JSON.parse(saved) : DEFAULT_CLIENT_PROFILE
  })

  useEffect(() => {
    localStorage.setItem('pos_client_profile', JSON.stringify(client))
  }, [client])

  const verticalConfig = BUSINESS_VERTICALS[client.businessType] || BUSINESS_VERTICALS.supermarket

  const setBusinessVertical = (businessType: BusinessVertical) => {
    setClient((prev) => ({
      ...prev,
      businessType,
    }))
  }

  const updateBranch = (branchName: string) => {
    setClient((prev) => ({
      ...prev,
      branchName,
    }))
  }

  const isModuleEnabled = (moduleId: ModuleId): boolean => {
    return client.enabledModules.includes(moduleId)
  }

  const isFeatureEnabled = (featureKey: keyof BusinessVerticalConfig['features']): boolean => {
    return !!verticalConfig.features[featureKey]
  }

  return (
    <ConfigContext.Provider
      value={{
        client,
        verticalConfig,
        allVerticals: BUSINESS_VERTICALS,
        setBusinessVertical,
        isModuleEnabled,
        isFeatureEnabled,
        updateBranch,
      }}
    >
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}

