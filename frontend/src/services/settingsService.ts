import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/endpoints'
import type { AppSettingMap, BusinessProfileData, RoleItem, StaffUser, SystemHealthData } from '../types/settings'

export const settingsService = {
  async getProfile(): Promise<BusinessProfileData> {
    const response = await apiClient.get<{ success: boolean; data: BusinessProfileData }>(API_ENDPOINTS.settings.profile)
    return response.data.data
  },

  async updateProfile(data: BusinessProfileData): Promise<BusinessProfileData> {
    const response = await apiClient.put<{ success: boolean; data: BusinessProfileData }>(API_ENDPOINTS.settings.updateProfile, data)
    return response.data.data
  },

  async getFeatures(): Promise<Record<string, boolean>> {
    const response = await apiClient.get<{ success: boolean; data: Record<string, boolean> }>(API_ENDPOINTS.settings.features)
    return response.data.data
  },

  async updateFeatures(features: Record<string, boolean>): Promise<Record<string, boolean>> {
    const response = await apiClient.put<{ success: boolean; data: Record<string, boolean> }>(API_ENDPOINTS.settings.updateFeatures, { features })
    return response.data.data
  },

  async getAllSettings(): Promise<AppSettingMap> {
    const response = await apiClient.get<{ success: boolean; data: AppSettingMap }>(API_ENDPOINTS.settings.all)
    return response.data.data
  },

  async updateSettings(group: string, settings: Record<string, unknown>): Promise<AppSettingMap> {
    const response = await apiClient.post<{ success: boolean; data: AppSettingMap }>(API_ENDPOINTS.settings.update, {
      group,
      settings,
    })
    return response.data.data
  },

  async getTaxSlabs(): Promise<any[]> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(API_ENDPOINTS.settings.taxSlabs)
    return response.data.data
  },

  async storeTaxSlab(data: any): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(API_ENDPOINTS.settings.storeTaxSlab, data)
    return response.data.data
  },

  async getUsers(): Promise<StaffUser[]> {
    const response = await apiClient.get<{ success: boolean; data: StaffUser[] }>(API_ENDPOINTS.settings.users)
    return response.data.data
  },

  async storeUser(data: {
    name: string
    email: string
    password: string
    pin_code?: string
    is_super_admin?: boolean
    branch_id: number
    role_id: number
  }): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(API_ENDPOINTS.settings.storeUser, data)
    return response.data.data
  },

  async getRoles(): Promise<{ roles: RoleItem[]; all_permissions: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: { roles: RoleItem[]; all_permissions: any[] } }>(API_ENDPOINTS.settings.roles)
    return response.data.data
  },

  async updateRolePermissions(roleId: number | string, permissionIds: number[]): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      API_ENDPOINTS.settings.updateRolePermissions(roleId),
      { permission_ids: permissionIds }
    )
    return response.data.data
  },

  async getHealth(): Promise<SystemHealthData> {
    const response = await apiClient.get<{ success: boolean; data: SystemHealthData }>(API_ENDPOINTS.settings.health)
    return response.data.data
  },
}

export default settingsService

