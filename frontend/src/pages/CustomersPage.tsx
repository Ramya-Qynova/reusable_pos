import React, { useState, useEffect, useCallback, useId } from 'react'
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Building,
  DollarSign,
  Download,
  Upload,
  CreditCard,
  Award,
  Layers,
  FileText,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Plus,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Pagination } from '../components/common/Pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table'
import { useNotification } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import customerService from '../services/customerService'
import type {
  Customer,
  CustomerFormData,
  CustomerGroup,
  CustomerLedgerEntry,
  CustomerLoyaltyEntry,
  CustomerPaginationMeta,
  CustomerStats,
} from '../types/customers'
import { cn } from '../utils/cn'

type CustomerTab = 'list' | 'groups'

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]>; error_code?: string } } })?.response?.data
  if (data?.errors && typeof data.errors === 'object') {
    const errorStrings = Object.values(data.errors).flat().filter(Boolean)
    if (errorStrings.length > 0) {
      return errorStrings.join(' ')
    }
  }
  return data?.message || fallback
}

export const CustomersPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const customerNameId = useId()
  const customerPhoneId = useId()

  const [activeTab, setActiveTab] = useState<CustomerTab>('list')

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [groups, setGroups] = useState<CustomerGroup[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [meta, setMeta] = useState<CustomerPaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<'profile' | 'ledger' | 'purchases' | 'loyalty'>('profile')

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Credit Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    notes: '',
  })
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)

  // Customer Group Modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null)
  const [groupForm, setGroupForm] = useState({
    name: '',
    code: '',
    discount_percentage: '0',
    credit_limit: '0',
    description: '',
  })

  // Bulk Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [importResults, setImportResults] = useState<{ imported_count: number; failed_count: number; errors: string[] } | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Form state
  const initialFormData: CustomerFormData = {
    customer_code: '',
    customer_group_id: '',
    customer_type: 'retail',
    name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    tax_number: '',
    credit_limit: '0',
    opening_balance: '0',
    notes: '',
    is_active: true,
  }
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Load Groups and Stats
  const loadMasterData = useCallback(async () => {
    try {
      const [groupsData, statsData] = await Promise.all([
        customerService.getGroups().catch(() => []),
        customerService.getDashboardStats().catch(() => null),
      ])
      setGroups(groupsData)
      if (statsData) setStats(statsData)
    } catch (err) {
      console.warn('Could not load customer metadata:', err)
    }
  }, [])

  // Fetch Customers
  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 15,
      }

      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (groupFilter) params.customer_group_id = groupFilter
      if (typeFilter) params.customer_type = typeFilter
      if (statusFilter === 'active') params.is_active = true
      else if (statusFilter === 'inactive') params.is_active = false

      const res = await customerService.getCustomers(params)
      setCustomers(res.items)
      if (res.meta) setMeta(res.meta)
    } catch (err) {
      showNotification({
        title: 'Failed to load customers',
        message: extractErrorMessage(err, 'Could not retrieve customers list.'),
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchQuery, groupFilter, typeFilter, statusFilter, showNotification])

  useEffect(() => {
    loadMasterData()
  }, [loadMasterData])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Open Create Modal
  const handleOpenCreateModal = async () => {
    setEditingCustomer(null)
    setFormErrors({})
    try {
      const nextCode = await customerService.getNextCode().catch(() => '')
      setFormData({
        ...initialFormData,
        customer_code: nextCode,
        customer_group_id: groups[0]?.id?.toString() || '',
      })
    } catch {
      setFormData(initialFormData)
    }
    setIsFormModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust)
    setFormErrors({})
    setFormData({
      customer_code: cust.customer_code,
      customer_group_id: cust.customer_group_id ? cust.customer_group_id.toString() : '',
      customer_type: cust.customer_type || 'retail',
      name: cust.name,
      phone: cust.phone,
      alternate_phone: cust.alternate_phone || '',
      email: cust.email || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      postal_code: cust.postal_code || '',
      tax_number: cust.tax_number || '',
      credit_limit: cust.credit_limit?.toString() || '0',
      opening_balance: cust.opening_balance?.toString() || '0',
      notes: cust.notes || '',
      is_active: cust.is_active,
    })
    setIsFormModalOpen(true)
  }

  // Open Customer Full Details Modal
  const handleOpenDetails = async (cust: Customer) => {
    try {
      const full = await customerService.getCustomer(cust.id).catch(() => cust)
      setViewingCustomer(full)
      setDetailTab('profile')
      setIsDetailModalOpen(true)
    } catch {
      setViewingCustomer(cust)
      setDetailTab('profile')
      setIsDetailModalOpen(true)
    }
  }

  // Open Payment Modal
  const handleOpenPayment = (cust: Customer) => {
    setPaymentCustomer(cust)
    setPaymentForm({
      amount: cust.current_balance > 0 ? cust.current_balance.toString() : '',
      payment_method: 'cash',
      notes: 'Customer account settlement',
    })
    setIsPaymentModalOpen(true)
  }

  // Save Customer (Create or Update)
  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    if (!formData.name.trim()) {
      setFormErrors({ name: 'Customer name is required' })
      return
    }
    if (!formData.phone.trim()) {
      setFormErrors({ phone: 'Mobile phone number is required' })
      return
    }

    try {
      setIsSubmitting(true)
      const payload: Record<string, unknown> = {
        customer_code: formData.customer_code,
        customer_group_id: formData.customer_group_id ? parseInt(String(formData.customer_group_id)) : null,
        customer_type: formData.customer_type,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        alternate_phone: formData.alternate_phone?.trim() || null,
        email: formData.email?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        postal_code: formData.postal_code?.trim() || null,
        tax_number: formData.tax_number?.trim() || null,
        credit_limit: parseFloat(String(formData.credit_limit || 0)),
        opening_balance: parseFloat(String(formData.opening_balance || 0)),
        notes: formData.notes?.trim() || null,
        is_active: formData.is_active,
      }

      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, payload)
        showNotification({
          title: 'Customer Updated',
          message: `Customer "${formData.name}" was updated successfully.`,
          type: 'success',
        })
      } else {
        await customerService.createCustomer(payload as any)
        showNotification({
          title: 'Customer Added',
          message: `Customer "${formData.name}" was registered.`,
          type: 'success',
        })
      }

      setIsFormModalOpen(false)
      loadCustomers()
      customerService.getDashboardStats().then(setStats).catch(() => null)
    } catch (err) {
      showNotification({
        title: editingCustomer ? 'Update Failed' : 'Creation Failed',
        message: extractErrorMessage(err, 'Failed to save customer record.'),
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Record Credit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentCustomer || !paymentForm.amount) return
    try {
      setIsRecordingPayment(true)
      await customerService.recordCreditPayment(paymentCustomer.id, {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes,
      })
      showNotification({
        title: 'Payment Recorded',
        message: `Received ₹${paymentForm.amount} from ${paymentCustomer.name}. Ledger updated.`,
        type: 'success',
      })
      setIsPaymentModalOpen(false)
      setPaymentCustomer(null)
      loadCustomers()
      customerService.getDashboardStats().then(setStats).catch(() => null)
    } catch (err) {
      showNotification({
        title: 'Payment Failed',
        message: extractErrorMessage(err, 'Could not record customer credit settlement.'),
        type: 'error',
      })
    } finally {
      setIsRecordingPayment(false)
    }
  }

  // Toggle Active Status
  const handleToggleStatus = async (cust: Customer) => {
    try {
      const updated = await customerService.toggleStatus(cust.id)
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? updated : c)))
      showNotification({
        title: updated.is_active ? 'Customer Activated' : 'Customer Deactivated',
        message: `${cust.name} is now ${updated.is_active ? 'active' : 'inactive'}.`,
        type: 'success',
      })
      customerService.getDashboardStats().then(setStats).catch(() => null)
    } catch (err) {
      showNotification({
        title: 'Failed to update status',
        message: extractErrorMessage(err, 'Could not update customer status.'),
        type: 'error',
      })
    }
  }

  // Delete Customer
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return
    try {
      await customerService.deleteCustomer(customerToDelete.id)
      showNotification({
        title: 'Customer Removed',
        message: `Customer "${customerToDelete.name}" was deactivated/deleted.`,
        type: 'info',
      })
      setIsDeleteConfirmOpen(false)
      setCustomerToDelete(null)
      loadCustomers()
      customerService.getDashboardStats().then(setStats).catch(() => null)
    } catch (err) {
      showNotification({
        title: 'Delete Denied',
        message: extractErrorMessage(err, 'Cannot delete customer with recorded transaction history.'),
        type: 'error',
      })
    }
  }

  // Customer Group Handlers
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: groupForm.name,
        code: groupForm.code,
        discount_percentage: parseFloat(groupForm.discount_percentage || '0'),
        credit_limit: parseFloat(groupForm.credit_limit || '0'),
        description: groupForm.description || null,
      }
      if (editingGroup) {
        await customerService.updateGroup(editingGroup.id, payload)
        showNotification({ title: 'Group Updated', message: `Group "${groupForm.name}" updated.`, type: 'success' })
      } else {
        await customerService.createGroup(payload)
        showNotification({ title: 'Group Created', message: `Group "${groupForm.name}" added.`, type: 'success' })
      }
      setIsGroupModalOpen(false)
      setEditingGroup(null)
      setGroupForm({ name: '', code: '', discount_percentage: '0', credit_limit: '0', description: '' })
      loadMasterData()
    } catch (err) {
      showNotification({ title: 'Error', message: extractErrorMessage(err, 'Failed to save group.'), type: 'error' })
    }
  }

  const handleDeleteGroup = async (group: CustomerGroup) => {
    try {
      await customerService.deleteGroup(group.id)
      showNotification({ title: 'Group Deleted', message: `Group "${group.name}" deleted.`, type: 'info' })
      loadMasterData()
    } catch (err) {
      showNotification({ title: 'Delete Denied', message: extractErrorMessage(err, 'Cannot delete group with assigned customers.'), type: 'error' })
    }
  }

  // Bulk Export Handler
  const handleBulkExport = async () => {
    try {
      const data = await customerService.bulkExport()
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute('download', `customers_export_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      showNotification({ title: 'Export Generated', message: `Exported ${data.length} customer records.`, type: 'success' })
    } catch (err) {
      showNotification({ title: 'Export Failed', message: extractErrorMessage(err, 'Failed to export customers.'), type: 'error' })
    }
  }

  // Bulk Import Handler
  const handleExecuteImport = async () => {
    try {
      setIsImporting(true)
      setImportResults(null)
      const parsed = JSON.parse(importJsonText)
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of customer objects.')
      const res = await customerService.bulkImport(parsed)
      setImportResults(res)
      if (res.imported_count > 0) {
        showNotification({ title: 'Import Successful', message: `Imported ${res.imported_count} customers.`, type: 'success' })
        loadCustomers()
        loadMasterData()
      }
    } catch (err) {
      const msg = (err as Error).message || extractErrorMessage(err, 'Failed to process import.')
      showNotification({ title: 'Import Failed', message: msg, type: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title="Customer Master & Loyalty"
        subtitle="Customer relationships, credit limits, accounts receivable ledger, loyalty reward points, and customer segmentation."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'list' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleBulkExport}
                >
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="w-4 h-4" />}
                  onClick={() => {
                    setImportResults(null)
                    setImportJsonText('')
                    setIsImportModalOpen(true)
                  }}
                >
                  Import
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                  onClick={handleOpenCreateModal}
                >
                  Add Customer
                </Button>
              </>
            )}
            {activeTab === 'groups' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingGroup(null)
                  setGroupForm({ name: '', code: '', discount_percentage: '0', credit_limit: '0', description: '' })
                  setIsGroupModalOpen(true)
                }}
              >
                Add Customer Group
              </Button>
            )}
          </div>
        }
      />

      {/* Customer Dashboard KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{stats.total_customers}</div>
            <span className="text-[10px] text-slate-500">Registered Directory</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-emerald-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Active</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">{stats.active_customers}</div>
            <span className="text-[10px] text-emerald-600">POS Enabled</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-rose-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">Credit Balance</span>
              <DollarSign className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600 mt-1 font-mono">₹{stats.total_credit_receivable.toLocaleString()}</div>
            <span className="text-[10px] text-rose-600">Total Outstanding</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-amber-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">In Debt</span>
              <CreditCard className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 mt-1 font-mono">{stats.customers_with_credit}</div>
            <span className="text-[10px] text-amber-600">Accounts with Due</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-purple-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-purple-700 uppercase tracking-wider">Loyalty Points</span>
              <Award className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-700 mt-1 font-mono">{stats.total_loyalty_points.toLocaleString()}</div>
            <span className="text-[10px] text-purple-600">Total Unclaimed</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-cyan-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-cyan-700 uppercase tracking-wider">Groups</span>
              <Layers className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-xl font-bold text-cyan-700 mt-1 font-mono">{stats.total_groups}</div>
            <span className="text-[10px] text-cyan-600">Customer Tiers</span>
          </Card>
        </div>
      )}

      {/* Navigation Submodule Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Customer Submodules">
          {[
            { id: 'list', label: 'Customer Directory', icon: Users },
            { id: 'groups', label: 'Customer Groups & Tiers', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as CustomerTab)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] sm:text-[14px] font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'border-[#D45060] text-[#D45060] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CUSTOMER DIRECTORY */}
      {/* ======================================================== */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-3.5 border-slate-200/80 shadow-xs">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, or code..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                />
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
                <select
                  value={groupFilter}
                  onChange={(e) => {
                    setGroupFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  aria-label="Filter by Group"
                  className="w-full sm:w-36 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                >
                  <option value="">All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  aria-label="Filter by Type"
                  className="w-full sm:w-32 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                >
                  <option value="">All Types</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="corporate">Corporate</option>
                  <option value="vip">VIP</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                    setCurrentPage(1)
                  }}
                  aria-label="Filter by Status"
                  className="w-full sm:w-28 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <Button variant="outline" size="sm" onClick={() => loadCustomers()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Customer Table */}
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Group & Type</TableHead>
                  <TableHead>Credit Balance / Limit</TableHead>
                  <TableHead>Loyalty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                      {isLoading ? 'Loading customers directory...' : 'No customers found. Click "Add Customer" to register one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{c.customer_code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{c.email}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="neutral" size="sm">
                            {c.group?.name || 'Standard'}
                          </Badge>
                          <span className="text-[11px] capitalize text-slate-500">({c.customer_type || 'retail'})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn('font-mono font-bold text-xs', c.current_balance > 0 ? 'text-rose-600' : 'text-slate-700')}>
                          Due: ₹{c.current_balance?.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">Limit: ₹{c.credit_limit?.toLocaleString() || 0}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-purple-700">
                          <Award className="w-3 h-3 text-purple-600" />
                          <span>{c.loyalty_points || 0} pts</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          className="cursor-pointer"
                          title="Click to toggle status"
                        >
                          <Badge variant={c.is_active ? 'success' : 'neutral'} size="sm">
                            {c.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="View Customer Profile & Ledger"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(c)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                            title="Record Credit Settlement"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerToDelete(c)
                              setIsDeleteConfirmOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {meta.last_page > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between">
                <Pagination
                  currentPage={meta.current_page}
                  totalPages={meta.last_page}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CUSTOMER GROUPS & TIERS */}
      {/* ======================================================== */}
      {activeTab === 'groups' && (
        <Card className="border-slate-200/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Discount %</TableHead>
                <TableHead>Default Credit Limit</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No customer groups found. Click "Add Customer Group" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>{g.name}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{g.code}</TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600">{g.discount_percentage}%</TableCell>
                    <TableCell className="font-mono text-xs">₹{g.credit_limit?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {g.customers_count ?? 0} Customers
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.is_active ? 'success' : 'neutral'} size="sm">
                        {g.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroup(g)
                            setGroupForm({
                              name: g.name,
                              code: g.code,
                              discount_percentage: g.discount_percentage.toString(),
                              credit_limit: g.credit_limit.toString(),
                              description: g.description || '',
                            })
                            setIsGroupModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Group"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT CUSTOMER */}
      {/* ======================================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Master' : 'Register New Customer'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitCustomer} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={customerNameId} className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name *
              </label>
              <Input
                id={customerNameId}
                required
                placeholder="e.g. Ramesh Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />
            </div>

            <div>
              <label htmlFor={customerPhoneId} className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Phone *
              </label>
              <Input
                id={customerPhoneId}
                required
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={formErrors.phone}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Code</label>
              <Input
                placeholder="e.g. CUST-001"
                value={formData.customer_code}
                onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="e.g. customer@example.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Group</label>
              <select
                value={formData.customer_group_id || ''}
                onChange={(e) => setFormData({ ...formData, customer_group_id: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                <option value="">No Group (Standard)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.discount_percentage}% off)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Type</label>
              <select
                value={formData.customer_type}
                onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                <option value="retail">Retail Consumer</option>
                <option value="wholesale">Wholesale Trader</option>
                <option value="corporate">Corporate Account</option>
                <option value="vip">VIP Patron</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax Number</label>
              <Input
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={formData.tax_number || ''}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
              <Input
                type="number"
                step="100"
                placeholder="e.g. 10000"
                value={formData.credit_limit || '0'}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              />
            </div>

            {!editingCustomer && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Due Balance (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.opening_balance || '0'}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <Input
                placeholder="e.g. Mumbai"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Street Address</label>
              <Input
                placeholder="Building, street, landmark, pincode..."
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
              <textarea
                rows={2}
                placeholder="Preferences, payment schedule, or delivery notes..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingCustomer ? 'Save Changes' : 'Register Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: CUSTOMER PROFILE & 360 VIEW */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setViewingCustomer(null)
        }}
        title="Customer 360° Profile"
        maxWidth="xl"
      >
        {viewingCustomer && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{viewingCustomer.name}</h3>
                  <Badge variant={viewingCustomer.is_active ? 'success' : 'neutral'} size="sm">
                    {viewingCustomer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="info" size="sm" className="capitalize">
                    {viewingCustomer.customer_type || 'Retail'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">Code: {viewingCustomer.customer_code} • Phone: {viewingCustomer.phone}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                onClick={() => {
                  setIsDetailModalOpen(false)
                  handleOpenPayment(viewingCustomer)
                }}
              >
                Record Payment
              </Button>
            </div>

            {/* Balances & Loyalty Metric Ribbon */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Credit Limit</span>
                <div className="text-lg font-mono font-bold text-slate-800 mt-0.5">₹{viewingCustomer.credit_limit?.toLocaleString() || 0}</div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Current Balance Due</span>
                <div className={cn('text-lg font-mono font-bold mt-0.5', viewingCustomer.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                  ₹{viewingCustomer.current_balance?.toLocaleString() || 0}
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Loyalty Balance</span>
                <div className="text-lg font-mono font-bold text-purple-700 mt-0.5">{viewingCustomer.loyalty_points || 0} Points</div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setDetailTab('profile')}
                className={cn('px-3 py-1.5 text-xs font-semibold border-b-2', detailTab === 'profile' ? 'border-[#D45060] text-[#D45060]' : 'border-transparent text-slate-500')}
              >
                Profile & Details
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('ledger')}
                className={cn('px-3 py-1.5 text-xs font-semibold border-b-2', detailTab === 'ledger' ? 'border-[#D45060] text-[#D45060]' : 'border-transparent text-slate-500')}
              >
                Account Ledger ({viewingCustomer.ledgers?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('purchases')}
                className={cn('px-3 py-1.5 text-xs font-semibold border-b-2', detailTab === 'purchases' ? 'border-[#D45060] text-[#D45060]' : 'border-transparent text-slate-500')}
              >
                Purchase History ({viewingCustomer.sales_orders?.length || 0})
              </button>
            </div>

            {detailTab === 'profile' && (
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div><span className="text-slate-400">Email:</span> <span className="font-medium text-slate-800">{viewingCustomer.email || '—'}</span></div>
                <div><span className="text-slate-400">Alt Phone:</span> <span className="font-medium text-slate-800">{viewingCustomer.alternate_phone || '—'}</span></div>
                <div><span className="text-slate-400">GSTIN:</span> <span className="font-medium text-slate-800">{viewingCustomer.tax_number || '—'}</span></div>
                <div><span className="text-slate-400">City / State:</span> <span className="font-medium text-slate-800">{viewingCustomer.city || '—'}, {viewingCustomer.state || '—'}</span></div>
                <div className="col-span-2"><span className="text-slate-400">Address:</span> <span className="font-medium text-slate-800">{viewingCustomer.address || '—'}</span></div>
                {viewingCustomer.notes && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block mb-1">Notes:</span>
                    <p className="text-slate-700">{viewingCustomer.notes}</p>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'ledger' && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Debit (+Due)</TableHead>
                      <TableHead>Credit (-Paid)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!viewingCustomer.ledgers || viewingCustomer.ledgers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                          No ledger transactions recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewingCustomer.ledgers.map((l: CustomerLedgerEntry) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs font-mono">{l.transaction_date?.slice(0, 10)}</TableCell>
                          <TableCell>
                            <Badge variant="neutral" size="sm" className="capitalize">
                              {l.transaction_type.replace('_', ' ')}
                            </Badge>
                            {l.notes && <div className="text-[10px] text-slate-400 mt-0.5">{l.notes}</div>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-rose-600 font-medium">
                            {l.debit > 0 ? `₹${l.debit}` : '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-emerald-600 font-medium">
                            {l.credit > 0 ? `₹${l.credit}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            ₹{l.running_balance}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {detailTab === 'purchases' && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!viewingCustomer.sales_orders || viewingCustomer.sales_orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                          No sales transactions found for this customer.
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewingCustomer.sales_orders.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono font-medium text-xs">{o.order_number}</TableCell>
                          <TableCell className="text-xs text-slate-500">{o.created_at?.slice(0, 10)}</TableCell>
                          <TableCell>
                            <Badge variant={o.payment_status === 'paid' ? 'success' : 'warning'} size="sm">
                              {o.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900">
                            ₹{o.total_amount}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: RECORD CREDIT PAYMENT */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setPaymentCustomer(null)
        }}
        title="Record Customer Credit Payment"
        maxWidth="md"
      >
        {paymentCustomer && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{paymentCustomer.name}</h4>
                  <span className="text-[11px] text-slate-500 font-mono">{paymentCustomer.customer_code}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Due Balance</span>
                  <div className="text-base font-black font-mono text-rose-600">₹{paymentCustomer.current_balance}</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Received (₹) *</label>
              <Input
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="cash">Cash in Drawer</option>
                <option value="upi">UPI / QR Code</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Notes / Ref</label>
              <Input
                placeholder="Cheque number, UTR, or receipt voucher..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isRecordingPayment}>
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT CUSTOMER GROUP */}
      {/* ======================================================== */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false)
          setEditingGroup(null)
        }}
        title={editingGroup ? 'Edit Customer Group' : 'Add Customer Group'}
      >
        <form onSubmit={handleSaveGroup} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group Name *</label>
            <Input
              required
              placeholder="e.g. VIP Club, Wholesale T1"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Group Code *</label>
            <Input
              required
              placeholder="e.g. GRP-VIP"
              value={groupForm.code}
              onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (%)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={groupForm.discount_percentage}
                onChange={(e) => setGroupForm({ ...groupForm, discount_percentage: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Credit Limit</label>
              <Input
                type="number"
                step="100"
                placeholder="0"
                value={groupForm.credit_limit}
                onChange={(e) => setGroupForm({ ...groupForm, credit_limit: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <Input
              placeholder="Benefits, eligibility criteria..."
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsGroupModalOpen(false)
                setEditingGroup(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingGroup ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: BULK IMPORT */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Customers"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Paste a JSON array of customer objects. Records with duplicate phone numbers or codes will be safely skipped.
          </p>

          <textarea
            rows={8}
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            placeholder={`[\n  {\n    "name": "Sunil Verma",\n    "phone": "9811223344",\n    "customer_type": "retail",\n    "city": "Pune",\n    "credit_limit": 5000\n  }\n]`}
            className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D45060]"
          />

          {importResults && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-emerald-700 font-semibold">Imported: {importResults.imported_count}</span>
                <span className="text-rose-700 font-semibold">Failed: {importResults.failed_count}</span>
              </div>
              {importResults.errors.length > 0 && (
                <div className="mt-2 text-rose-600 space-y-0.5">
                  {importResults.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isImporting}
              disabled={!importJsonText.trim()}
              onClick={handleExecuteImport}
            >
              Execute Bulk Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer"
        message={`Are you sure you want to deactivate customer "${customerToDelete?.name}"? Existing sales orders and ledger balances will remain intact.`}
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  )
}

export default CustomersPage
