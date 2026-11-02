import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Building2,
  GitBranch,
  DollarSign,
  Percent,
  Receipt,
  CreditCard,
  Users,
  Shield,
  Printer,
  Barcode,
  Bell,
  Database,
  CloudLightning,
  Save,
  CheckCircle,
  Plus,
  RefreshCw,
  Activity,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table'
import { useNotification } from '../context/NotificationContext'
import { useOffline } from '../context/OfflineContext'
import settingsService from '../services/settingsService'
import type {
  AppSettingMap,
  BusinessProfileData,
  RoleItem,
  StaffUser,
  SystemHealthData,
} from '../types/settings'
import { cn } from '../utils/cn'

type SettingsTab =
  | 'general'
  | 'profile'
  | 'branches'
  | 'currency'
  | 'tax'
  | 'invoice'
  | 'payment'
  | 'users'
  | 'roles'
  | 'printer'
  | 'barcode'
  | 'notifications'
  | 'backup'
  | 'sync'

export const SettingsPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { isOnline, triggerSync, lastSuccessfulSync, pendingTransactionsCount } = useOffline()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  // Data states
  const [profile, setProfile] = useState<BusinessProfileData>({
    client_name: '',
    legal_name: '',
    tax_id: '',
    currency_code: 'INR',
    currency_symbol: '₹',
    timezone: 'Asia/Kolkata',
    email: '',
    phone: '',
    address: '',
  })
  const [settings, setSettings] = useState<AppSettingMap>({})
  const [taxSlabs, setTaxSlabs] = useState<any[]>([])
  const [users, setUsers] = useState<StaffUser[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [allPermissions, setAllPermissions] = useState<any[]>([])
  const [health, setHealth] = useState<SystemHealthData | null>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Modals
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newTaxForm, setNewTaxForm] = useState({ name: '', rate: '', is_active: true })
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    pin_code: '1234',
    branch_id: '1',
    role_id: '1',
    is_super_admin: false,
  })

  // Load All Settings & Profile
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [profRes, settRes, taxRes, userRes, roleRes, healthRes] = await Promise.all([
        settingsService.getProfile(),
        settingsService.getAllSettings(),
        settingsService.getTaxSlabs(),
        settingsService.getUsers(),
        settingsService.getRoles(),
        settingsService.getHealth(),
      ])

      setProfile(profRes)
      setSettings(settRes)
      setTaxSlabs(taxRes)
      setUsers(userRes)
      setRoles(roleRes.roles)
      setAllPermissions(roleRes.all_permissions)
      setHealth(healthRes)
    } catch (err) {
      console.warn('Could not load some settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Save General Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const updated = await settingsService.updateProfile(profile)
      setProfile(updated)
      showNotification({ title: 'Success', message: 'Business profile updated successfully.', type: 'success' })
    } catch (err) {
      showNotification({ title: 'Error', message: (err as Error).message, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  // Save Settings Group
  const handleSaveSettingsGroup = async (groupName: string, values: Record<string, unknown>) => {
    try {
      setIsSaving(true)
      const updated = await settingsService.updateSettings(groupName, values)
      setSettings(updated)
      showNotification({ title: 'Success', message: `${groupName.toUpperCase()} configuration saved.`, type: 'success' })
    } catch (err) {
      showNotification({ title: 'Error', message: (err as Error).message, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  // Save Tax Slab
  const handleSaveTaxSlab = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await settingsService.storeTaxSlab({
        name: newTaxForm.name,
        rate: Number(newTaxForm.rate),
        is_active: newTaxForm.is_active,
      })
      showNotification({ title: 'Success', message: 'Tax slab created.', type: 'success' })
      setIsTaxModalOpen(false)
      const refreshed = await settingsService.getTaxSlabs()
      setTaxSlabs(refreshed)
    } catch (err) {
      showNotification({ title: 'Error', message: (err as Error).message, type: 'error' })
    }
  }

  // Save New Staff User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await settingsService.storeUser({
        name: newUserForm.name,
        email: newUserForm.email,
        password: newUserForm.password,
        pin_code: newUserForm.pin_code,
        branch_id: Number(newUserForm.branch_id),
        role_id: Number(newUserForm.role_id),
        is_super_admin: newUserForm.is_super_admin,
      })
      showNotification({ title: 'Success', message: 'Staff user created successfully.', type: 'success' })
      setIsUserModalOpen(false)
      const refreshed = await settingsService.getUsers()
      setUsers(refreshed)
    } catch (err) {
      showNotification({ title: 'Error', message: (err as Error).message, type: 'error' })
    }
  }

  // Toggle Role Permission
  const handleTogglePermission = async (role: RoleItem, permissionId: number) => {
    const currentPermIds = role.permissions.map((p) => p.id)
    const exists = currentPermIds.includes(permissionId)
    const newPermIds = exists
      ? currentPermIds.filter((id) => id !== permissionId)
      : [...currentPermIds, permissionId]

    try {
      await settingsService.updateRolePermissions(role.id, newPermIds)
      const res = await settingsService.getRoles()
      setRoles(res.roles)
      showNotification({ title: 'Updated', message: 'Role permissions modified.', type: 'info' })
    } catch (err) {
      showNotification({ title: 'Error', message: (err as Error).message, type: 'error' })
    }
  }

  const tabsConfig = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'branches', label: 'Branch Setup', icon: GitBranch },
    { id: 'currency', label: 'Currency', icon: DollarSign },
    { id: 'tax', label: 'Tax & GST', icon: Percent },
    { id: 'invoice', label: 'Invoice Format', icon: Receipt },
    { id: 'payment', label: 'Payment Options', icon: CreditCard },
    { id: 'users', label: 'Staff Users', icon: Users },
    { id: 'roles', label: 'Roles & Access', icon: Shield },
    { id: 'printer', label: 'Receipt Printer', icon: Printer },
    { id: 'barcode', label: 'Barcode Setup', icon: Barcode },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'backup', label: 'Backup & Health', icon: Database },
    { id: 'sync', label: 'Offline / Sync', icon: CloudLightning },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Manage business identity, taxes, roles, hardware printers, and offline synchronization"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Vertical Sub-Navigation */}
        <div className="space-y-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs self-start">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer',
                  isActive
                    ? 'bg-[#D45060] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right Tab Content */}
        <div className="md:col-span-3 space-y-4">
          {/* 1. GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#D45060]" /> General POS Application Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store Display Name</label>
                  <Input
                    value={(settings.general?.store_name as string) || 'Green Mart Supermarket'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, store_name: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
                  <Input
                    value={(settings.general?.timezone as string) || 'Asia/Kolkata'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, timezone: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Format</label>
                  <select
                    value={(settings.general?.date_format as string) || 'DD/MM/YYYY'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, date_format: e.target.value },
                      })
                    }
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Allow Negative Stock</label>
                  <select
                    value={settings.general?.allow_negative_stock ? '1' : '0'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, allow_negative_stock: e.target.value === '1' },
                      })
                    }
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="0">Disallow (Strict Inventory Control)</option>
                    <option value="1">Allow (Prevent POS register blocking)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button
                  onClick={() => handleSaveSettingsGroup('general', settings.general || {})}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-1.5" /> Save General Settings
                </Button>
              </div>
            </Card>
          )}

          {/* 2. BUSINESS PROFILE */}
          {activeTab === 'profile' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#D45060]" /> Store Profile & Legal Entity
              </h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Trading Name</label>
                    <Input
                      value={profile.client_name || ''}
                      onChange={(e) => setProfile({ ...profile, client_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Company Name</label>
                    <Input
                      value={profile.legal_name || ''}
                      onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax ID</label>
                    <Input
                      value={profile.tax_id || ''}
                      onChange={(e) => setProfile({ ...profile, tax_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Support Phone</label>
                    <Input
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
                    <Input
                      type="email"
                      value={profile.email || ''}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address</label>
                  <Input
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="w-4 h-4 mr-1.5" /> Save Business Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* 3. BRANCH SETUP */}
          {activeTab === 'branches' && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#D45060]" /> Multi-Branch Directory
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Main Branch', code: 'MAIN', address: '124, Commercial Road, Central Market', isMain: true },
                  { name: 'North Annex', code: 'NORTH', address: 'Shop 12, North Commercial Complex', isMain: false },
                  { name: 'Metro Center', code: 'METRO', address: 'Galleria Mall Lower Ground', isMain: false },
                  { name: 'Airport Express', code: 'AIRPORT', address: 'T2 Departures Kiosk 4', isMain: false },
                ].map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{b.name}</span>
                        <span className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          {b.code}
                        </span>
                        {b.isMain && <Badge variant="success">Main Store</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{b.address}</p>
                    </div>
                    <Badge variant="neutral">Active</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 4. CURRENCY */}
          {activeTab === 'currency' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#D45060]" /> Currency Settings
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
                  <Input
                    value={(settings.currency?.currency_symbol as string) || '₹'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        currency: { ...settings.currency, currency_symbol: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ISO Code</label>
                  <Input
                    value={(settings.currency?.currency_code as string) || 'INR'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        currency: { ...settings.currency, currency_code: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Decimal Places</label>
                  <Input
                    type="number"
                    value={Number(settings.currency?.decimal_places ?? 2)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        currency: { ...settings.currency, decimal_places: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button onClick={() => handleSaveSettingsGroup('currency', settings.currency || {})}>
                  <Save className="w-4 h-4 mr-1.5" /> Save Currency Configuration
                </Button>
              </div>
            </Card>
          )}

          {/* 5. TAX & GST */}
          {activeTab === 'tax' && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#D45060]" /> GST / Taxation Slabs
                </h3>
                <Button size="sm" onClick={() => setIsTaxModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Slab
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slab Name</TableHead>
                      <TableHead className="text-right">Total Rate</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxSlabs.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold text-xs text-slate-900">{s.name}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{s.rate}%</TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-500">{s.cgst_rate}%</TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-500">{s.sgst_rate}%</TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-500">{s.igst_rate}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={s.is_active ? 'success' : 'neutral'}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* 6. INVOICE FORMAT */}
          {activeTab === 'invoice' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#D45060]" /> Sales Receipt & Invoice Format
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                  <Input
                    value={(settings.invoice?.invoice_prefix as string) || 'INV'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        invoice: { ...settings.invoice, invoice_prefix: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thermal Copies</label>
                  <Input
                    type="number"
                    value={Number(settings.invoice?.print_thermal_copies ?? 1)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        invoice: { ...settings.invoice, print_thermal_copies: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Header Welcome Note</label>
                <Input
                  value={(settings.invoice?.header_note as string) || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      invoice: { ...settings.invoice, header_note: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Terms & Conditions</label>
                <Input
                  value={(settings.invoice?.footer_note as string) || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      invoice: { ...settings.invoice, footer_note: e.target.value },
                    })
                  }
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button onClick={() => handleSaveSettingsGroup('invoice', settings.invoice || {})}>
                  <Save className="w-4 h-4 mr-1.5" /> Save Invoice Format
                </Button>
              </div>
            </Card>
          )}

          {/* 7. PAYMENT SETTINGS */}
          {activeTab === 'payment' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#D45060]" /> Payment Gateways & Counter Modes
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Cash Register Checkout', desc: 'Accept physical cash currency with change calculator', enabled: true },
                  { name: 'UPI & Dynamic QR Payments', desc: 'Scan QR using Google Pay, PhonePe, Paytm', enabled: true },
                  { name: 'Credit / Debit Card Terminal', desc: 'Integrated POS EDC swiping machine', enabled: true },
                  { name: 'Customer Credit Account', desc: 'Allow payment on store credit ledger with credit limit checks', enabled: true },
                  { name: 'Bank Transfer / NEFT', desc: 'Wholesale B2B direct bank transfers', enabled: true },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{m.name}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                    </div>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 8. STAFF USERS */}
          {activeTab === 'users' && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D45060]" /> Staff & Cashier User Directory
                </h3>
                <Button size="sm" onClick={() => setIsUserModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Staff User
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned Branch & Role</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-bold text-xs text-slate-900">
                          {u.name}
                          {u.is_super_admin && (
                            <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                              Super Admin
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{u.email}</TableCell>
                        <TableCell className="text-xs">
                          {u.branch_roles?.map((br, idx) => (
                            <span key={idx} className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] mr-1">
                              {br.branch}: <strong>{br.role}</strong>
                            </span>
                          )) || 'Store Admin'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.is_active ? 'success' : 'neutral'}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* 9. ROLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D45060]" /> Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Configure module-level and operational permissions for each application role.
              </p>

              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{role.name}</h4>
                        <p className="text-xs text-slate-500">{role.description}</p>
                      </div>
                      <Badge variant="neutral">{role.permissions.length} Permissions</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                      {allPermissions.map((perm) => {
                        const isChecked = role.permissions.some((p) => p.id === perm.id)
                        return (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-white cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(role, perm.id)}
                              className="rounded text-[#D45060]"
                            />
                            <span className="truncate">{perm.slug}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 10. PRINTER */}
          {activeTab === 'printer' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#D45060]" /> Receipt Printer Hardware Setup
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Printer Symbology</label>
                  <select
                    value={(settings.printer?.printer_type as string) || 'thermal_80mm'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        printer: { ...settings.printer, printer_type: e.target.value },
                      })
                    }
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="thermal_80mm">Thermal 80mm Standard POS Printer</option>
                    <option value="thermal_58mm">Thermal 58mm Compact Receipt Printer</option>
                    <option value="laser_a4">Standard Office A4 / Laser Printer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Auto-Cut Paper</label>
                  <select
                    value={settings.printer?.auto_cut_paper ? '1' : '0'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        printer: { ...settings.printer, auto_cut_paper: e.target.value === '1' },
                      })
                    }
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="1">Enabled (Send GS V 0 cut code)</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button onClick={() => handleSaveSettingsGroup('printer', settings.printer || {})}>
                  <Save className="w-4 h-4 mr-1.5" /> Save Printer Settings
                </Button>
              </div>
            </Card>
          )}

          {/* 11. BARCODE */}
          {activeTab === 'barcode' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-[#D45060]" /> Barcode Scanner & Symbology Setup
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Symbology</label>
                  <select
                    value={(settings.barcode?.symbology as string) || 'CODE128'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        barcode: { ...settings.barcode, symbology: e.target.value },
                      })
                    }
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="CODE128">Code 128 (Variable Alphanumeric)</option>
                    <option value="EAN13">EAN-13 (13 Digits Standard Retail)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode Code Prefix</label>
                  <Input
                    value={(settings.barcode?.barcode_prefix as string) || 'GM'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        barcode: { ...settings.barcode, barcode_prefix: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button onClick={() => handleSaveSettingsGroup('barcode', settings.barcode || {})}>
                  <Save className="w-4 h-4 mr-1.5" /> Save Barcode Settings
                </Button>
              </div>
            </Card>
          )}

          {/* 12. NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D45060]" /> Alerts & Notification Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Low Stock Alert Threshold</label>
                  <Input
                    type="number"
                    value={Number(settings.notification?.low_stock_threshold_alert ?? 5)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notification: {
                          ...settings.notification,
                          low_stock_threshold_alert: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Summary Email</label>
                  <select
                    value={settings.notification?.email_daily_summary ? '1' : '0'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notification: {
                          ...settings.notification,
                          email_daily_summary: e.target.value === '1',
                        },
                      })
                    }
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="1">Enabled (End-of-day digest)</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button onClick={() => handleSaveSettingsGroup('notification', settings.notification || {})}>
                  <Save className="w-4 h-4 mr-1.5" /> Save Notification Settings
                </Button>
              </div>
            </Card>
          )}

          {/* 13. BACKUP & HEALTH */}
          {activeTab === 'backup' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#D45060]" /> Backup & System Diagnostics
              </h3>
              {health && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Framework & PHP</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        Laravel {health.laravel_version} • PHP {health.php_version}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Database Connection</div>
                      <div className="text-sm font-bold text-emerald-600 mt-0.5 uppercase">
                        {health.database_connection} (Connected)
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Server Time</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {new Date(health.server_time).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Live Table Record Counts</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(health.record_counts).map(([tbl, count]) => (
                        <div key={tbl} className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                          <div className="text-base font-bold text-slate-800">{count}</div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">{tbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 14. OFFLINE / SYNC */}
          {activeTab === 'sync' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <CloudLightning className="w-4 h-4 text-[#D45060]" /> Offline Caching & Synchronization Settings
              </h3>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Connection Status</div>
                    <p className="text-[11px] text-slate-500">Live network connectivity</p>
                  </div>
                  <Badge variant={isOnline ? 'success' : 'warning'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Pending Local Transactions</div>
                    <p className="text-[11px] text-slate-500">Awaiting upload to server</p>
                  </div>
                  <Badge variant="neutral">{pendingTransactionsCount} Records</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Last Full Sync</div>
                    <p className="text-[11px] text-slate-500">Timestamp of latest delta pull</p>
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-700">{lastSuccessfulSync}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Periodic Auto-Sync (Minutes)</label>
                  <Input
                    type="number"
                    value={Number(settings.sync?.auto_sync_interval_mins ?? 5)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sync: { ...settings.sync, auto_sync_interval_mins: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Conflict Resolution Strategy</label>
                  <select
                    value={(settings.sync?.conflict_resolution as string) || 'server_wins'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sync: { ...settings.sync, conflict_resolution: e.target.value },
                      })
                    }
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="server_wins">Server Wins (Conservative / Never overwrite newer server records)</option>
                    <option value="client_wins">Client Wins (Force override)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={triggerSync} disabled={!isOnline}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Force Sync Now
                </Button>
                <Button onClick={() => handleSaveSettingsGroup('sync', settings.sync || {})}>
                  <Save className="w-4 h-4 mr-1.5" /> Save Sync Settings
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD TAX SLAB */}
      <Modal isOpen={isTaxModalOpen} onClose={() => setIsTaxModalOpen(false)} title="Create New Tax / GST Slab">
        <form onSubmit={handleSaveTaxSlab} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Slab Name</label>
            <Input
              placeholder="e.g. GST 15% (Special)"
              value={newTaxForm.name}
              onChange={(e) => setNewTaxForm({ ...newTaxForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Total Rate (%)</label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 15"
              value={newTaxForm.rate}
              onChange={(e) => setNewTaxForm({ ...newTaxForm, rate: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsTaxModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Slab</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD STAFF USER */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Register Staff User">
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <Input
                placeholder="e.g. Anand Cashier"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                placeholder="anand@greenmart.pos"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quick PIN (4 digits)</label>
              <Input
                placeholder="1234"
                value={newUserForm.pin_code}
                onChange={(e) => setNewUserForm({ ...newUserForm, pin_code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
              <select
                value={newUserForm.role_id}
                onChange={(e) => setNewUserForm({ ...newUserForm, role_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2 bg-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Branch</label>
              <select
                value={newUserForm.branch_id}
                onChange={(e) => setNewUserForm({ ...newUserForm, branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2 bg-white"
              >
                <option value="1">Main Branch</option>
                <option value="2">North Annex</option>
                <option value="3">Metro Center</option>
                <option value="4">Airport Express</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Staff Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SettingsPage
