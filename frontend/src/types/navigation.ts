import type { ReactNode } from 'react'
import type { ModuleId } from './business'

export interface NavItem {
  id: ModuleId
  label: string
  path: string
  icon: (props: { className?: string }) => ReactNode
  badge?: string | number
  description?: string
}

export interface UserProfile {
  id: string
  name: string
  role: string
  avatarUrl?: string
  email: string
}

