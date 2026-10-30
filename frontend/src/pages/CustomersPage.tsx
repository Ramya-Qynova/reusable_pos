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
  FileText,
  Building,
  ToggleLeft,
  ToggleRight,
  Filter,
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
import { EmptyState } from '../components/common/EmptyState'
import { useNotification } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import customerService from '../services/customerService'
import type { Customer, CustomerFormData, CustomerPaginationMeta } from '../types/customers'
import { cn } from '../utils/cn'

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

  // Permissions: Super admins or users with admin role can manage
  const canManage = user?.is_super_admin || true // Backend enforces CheckPermission on mutating routes

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [meta, setMeta] = useState<CustomerPaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const initialFormData: CustomerFormData = {
    customer_code: '',
    name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    tax_number: '',
    notes: '',
    is_active: true,
  }
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch Customers
  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: {
        page: number
        per_page: number
        search?: string
        is_active?: boolean | string
        city?: string
      } = {
        page: currentPage,
        per_page: 15,
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      if (statusFilter === 'active') {
        params.is_active = true
      } else if (statusFilter === 'inactive') {
        params.is_active = false
      }

      if (cityFilter.trim()) {
        params.city = cityFilter.trim()
      }

      const res = await customerService.getCustomers(params)
      setCustomers(res.items)
      if (res.meta) {
        setMeta(res.meta)
      }
    } catch (err) {
      showNotification({
        title: 'Failed to load customers',
        message: extractErrorMessage(err, 'Could not retrieve customers list.'),
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchQuery, statusFilter, cityFilter, showNotification])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Reset page when filters change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (val: 'all' | 'active' | 'inactive') => {
    setStatusFilter(val)
    setCurrentPage(1)
  }

  // Open Create Modal
  const handleOpenCreateModal = async () => {
    setEditingCustomer(null)
    setFormErrors({})
    try {
      const nextCode = await customerService.getNextCode().catch(() => '')
      setFormData({
        ...initialFormData,
        customer_code: nextCode,
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
      name: cust.name,
      phone: cust.phone,
      alternate_phone: cust.alternate_phone || '',
      email: cust.email || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      postal_code: cust.postal_code || '',
      tax_number: cust.tax_number || '',
      notes: cust.notes || '',
      is_active: cust.is_active,
    })
    setIsFormModalOpen(true)
  }

  // View Customer
  const handleOpenViewModal = (cust: Customer) => {
    setViewingCustomer(cust)
  }

  // Save Customer (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validations
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Customer name is required.'
    if (!formData.phone.trim()) errors.phone = 'Phone number is required.'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please provide a valid email address.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setIsSubmitting(true)
      setFormErrors({})

      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, formData)
        showNotification({
          title: 'Customer Updated',
          message: `Customer "${formData.name}" was updated successfully.`,
          type: 'success',
        })
      } else {
        await customerService.createCustomer(formData)
        showNotification({
          title: 'Customer Created',
          message: `Customer "${formData.name}" has been created successfully.`,
          type: 'success',
        })
      }

      setIsFormModalOpen(false)
      loadCustomers()
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Failed to save customer.')
      showNotification({
        title: 'Error Saving Customer',
        message: errorMsg,
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Status
  const handleToggleStatus = async (cust: Customer) => {
    try {
      const updated = await customerService.toggleStatus(cust.id)
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? updated : c)))
      if (viewingCustomer && viewingCustomer.id === cust.id) {
        setViewingCustomer(updated)
      }
      showNotification({
        title: 'Status Updated',
        message: `Customer "${cust.name}" marked as ${updated.is_active ? 'Active' : 'Inactive'}.`,
        type: 'info',
      })
    } catch (err) {
      showNotification({
        title: 'Status Update Failed',
        message: extractErrorMessage(err, 'Could not change customer status.'),
        type: 'error',
      })
    }
  }

  // Delete Customer
  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return
    try {
      setIsSubmitting(true)
      await customerService.deleteCustomer(customerToDelete.id)
      showNotification({
        title: 'Customer Deleted',
        message: `Customer "${customerToDelete.name}" was removed successfully.`,
        type: 'success',
      })
      setIsDeleteConfirmOpen(false)
      setCustomerToDelete(null)
      loadCustomers()
    } catch (err) {
      showNotification({
        title: 'Deletion Blocked',
        message: extractErrorMessage(
          err,
          'Cannot delete customer because they are referenced in transactions. Deactivate instead.'
        ),
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary Metrics
  const activeCount = customers.filter((c) => c.is_active).length
  const inactiveCount = customers.filter((c) => !c.is_active).length
  const taxIdCount = customers.filter((c) => !!c.tax_number).length

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title="Customers Master"
        subtitle="Manage customer profiles, contact numbers, and tax identification across all branches."
        actions={
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </Button>
        }
      />

      {/* 2. Quick Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-slate-200/90 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Listed</p>
            <p className="text-xl font-bold text-slate-800">{meta.total}</p>
          </div>
        </Card>

        <Card className="p-3 border-slate-200/90 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active</p>
            <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
          </div>
        </Card>

        <Card className="p-3 border-slate-200/90 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Inactive</p>
            <p className="text-xl font-bold text-amber-600">{inactiveCount}</p>
          </div>
        </Card>

        <Card className="p-3 border-slate-200/90 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">GST Registered</p>
            <p className="text-xl font-bold text-purple-600">{taxIdCount}</p>
          </div>
        </Card>
      </div>

      {/* 3. Filter & Search Bar */}
      <Card className="p-3.5 shadow-xs border-slate-200/90">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, phone, code, email, or city..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D45060]/20 focus:border-[#D45060] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status & Action Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleStatusFilterChange('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors',
                  statusFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange('active')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors',
                  statusFilter === 'active'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange('inactive')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors',
                  statusFilter === 'inactive'
                    ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Inactive
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadCustomers}
              disabled={isLoading}
              title="Refresh customer list"
              className="p-1.5"
            >
              <RefreshCw className={cn('w-4 h-4 text-slate-600', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Customer Data Table */}
      <Card className="overflow-hidden shadow-xs border-slate-200/90">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/75 border-b border-slate-200">
                <TableHead className="w-28 font-bold text-slate-700">Code</TableHead>
                <TableHead className="font-bold text-slate-700">Customer Name</TableHead>
                <TableHead className="font-bold text-slate-700">Contact</TableHead>
                <TableHead className="font-bold text-slate-700">Location</TableHead>
                <TableHead className="font-bold text-slate-700">Tax ID / Notes</TableHead>
                <TableHead className="w-24 text-center font-bold text-slate-700">Status</TableHead>
                <TableHead className="w-32 text-right font-bold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#D45060]" />
                      <span className="text-xs font-medium">Loading customers directory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44">
                    <EmptyState
                      title="No customers found"
                      description={
                        searchQuery
                          ? `No customer matches query "${searchQuery}". Try a different keyword.`
                          : 'There are currently no customers in this view. Click Add Customer to create one.'
                      }
                      action={
                        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Add Customer
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((cust) => (
                  <TableRow
                    key={cust.id}
                    className="hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    {/* Customer Code */}
                    <TableCell className="font-mono text-xs font-semibold text-slate-700">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80">
                        {cust.customer_code}
                      </span>
                    </TableCell>

                    {/* Customer Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#FDF2F4] text-[#D45060] font-bold text-xs flex items-center justify-center shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-snug">{cust.name}</p>
                          {cust.email && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-300" />
                              {cust.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Phones */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.phone}</span>
                        </p>
                        {cust.alternate_phone && (
                          <p className="text-[11px] text-slate-400 pl-5">
                            Alt: {cust.alternate_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      <div className="text-xs text-slate-600">
                        {cust.city ? (
                          <p className="flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {cust.city}
                            {cust.state ? `, ${cust.state}` : ''}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic">No address</span>
                        )}
                        {cust.postal_code && (
                          <p className="text-[11px] text-slate-400 pl-4">{cust.postal_code}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Tax ID & Notes */}
                    <TableCell>
                      <div className="space-y-0.5 max-w-[200px]">
                        {cust.tax_number ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            {cust.tax_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Regular Buyer</span>
                        )}
                        {cust.notes && (
                          <p className="text-[11px] text-slate-500 truncate" title={cust.notes}>
                            {cust.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="text-center">
                      {cust.is_active ? (
                        <Badge variant="success" size="sm" dot>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm" dot>
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenViewModal(cust)}
                          title="View customer details"
                          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cust)}
                          title="Edit customer details"
                          className="p-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cust)}
                          title={cust.is_active ? 'Deactivate customer' : 'Activate customer'}
                          className={cn(
                            'p-1 rounded-md transition-colors cursor-pointer',
                            cust.is_active
                              ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          )}
                        >
                          {cust.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCustomerToDelete(cust)
                            setIsDeleteConfirmOpen(true)
                          }}
                          title="Delete customer safely"
                          className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {meta.total > 0 && (
          <div className="px-4 border-t border-slate-100 bg-slate-50/50">
            <Pagination
              currentPage={meta.current_page}
              totalPages={meta.last_page}
              totalItems={meta.total}
              itemsPerPage={meta.per_page}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </Card>

      {/* =========================================================================
          5. Create / Edit Customer Modal
          ========================================================================= */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'New Customer Profile'}
        subtitle="Customer records are shared across all installation branches."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-[#D45060] focus:ring-[#D45060] h-4 w-4"
                />
                <span>Active Profile</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFormModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitForm}
                isLoading={isSubmitting}
              >
                {editingCustomer ? 'Update Customer' : 'Create Customer'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-3.5">
          {/* Row 1: Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <Input
                label="Customer Code"
                placeholder="Auto (CUST-XXXXX)"
                value={formData.customer_code}
                onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
                error={formErrors.customer_code}
                helperText="Leave empty to auto-generate"
              />
            </div>
            <div className="sm:col-span-8">
              <Input
                label="Customer Name *"
                placeholder="Full individual or company name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                required
              />
            </div>
          </div>

          {/* Row 2: Phone, Alternate Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                label="Primary Phone *"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={formErrors.phone}
                required
              />
            </div>
            <div>
              <Input
                label="Alternative Phone"
                placeholder="Secondary / Office contact"
                value={formData.alternate_phone}
                onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="customer@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={formErrors.email}
              />
            </div>
          </div>

          {/* Row 3: Address */}
          <div>
            <label htmlFor={customerNameId} className="block text-xs font-medium text-slate-700 mb-1">
              Billing / Street Address
            </label>
            <textarea
              id={customerNameId}
              rows={2}
              placeholder="Door number, building, street, area..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#D45060] focus:outline-none focus:ring-2 focus:ring-[#D45060]/20 transition-colors"
            />
          </div>

          {/* Row 4: City, State, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                label="City"
                placeholder="e.g. Chennai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="State"
                placeholder="e.g. Tamil Nadu"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Postal Code (PIN)"
                placeholder="e.g. 600001"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
          </div>

          {/* Row 5: GSTIN / Tax ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="GSTIN / Tax ID"
                placeholder="e.g. 33AABCT9988K1Z3"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value.toUpperCase() })}
                helperText="Optional business tax registration number"
              />
            </div>
            <div>
              <label htmlFor={customerPhoneId} className="block text-xs font-medium text-slate-700 mb-1">
                Internal Notes
              </label>
              <input
                id={customerPhoneId}
                type="text"
                placeholder="Delivery instructions, preferences..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#D45060] focus:outline-none focus:ring-2 focus:ring-[#D45060]/20 transition-colors"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          6. View Customer Details Modal
          ========================================================================= */}
      {viewingCustomer && (
        <Modal
          isOpen={!!viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          title="Customer Profile Details"
          subtitle={`Master record: ${viewingCustomer.customer_code}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant={viewingCustomer.is_active ? 'outline' : 'primary'}
                size="sm"
                onClick={() => handleToggleStatus(viewingCustomer)}
              >
                {viewingCustomer.is_active ? 'Deactivate Customer' : 'Activate Customer'}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const cust = viewingCustomer
                    setViewingCustomer(null)
                    handleOpenEditModal(cust)
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit Customer
                </Button>
                <Button variant="primary" size="sm" onClick={() => setViewingCustomer(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            {/* Header snippet */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#FDF2F4] text-[#D45060] font-bold text-base flex items-center justify-center">
                  {viewingCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base leading-tight">
                    {viewingCustomer.name}
                  </h4>
                  <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                    {viewingCustomer.customer_code}
                  </p>
                </div>
              </div>
              <Badge variant={viewingCustomer.is_active ? 'success' : 'neutral'} size="md" dot>
                {viewingCustomer.is_active ? 'Active Profile' : 'Inactive Profile'}
              </Badge>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium block mb-1">Phone Number</span>
                <span className="font-semibold text-slate-800 text-sm">{viewingCustomer.phone}</span>
                {viewingCustomer.alternate_phone && (
                  <span className="text-slate-500 block mt-0.5">
                    Alt: {viewingCustomer.alternate_phone}
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium block mb-1">Email Address</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {viewingCustomer.email || <span className="text-slate-400 italic">Not specified</span>}
                </span>
              </div>
            </div>

            {/* Tax & GSTIN */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 font-medium block mb-1">GSTIN / Tax Identification</span>
              <span className="font-mono font-semibold text-slate-800 text-sm">
                {viewingCustomer.tax_number || (
                  <span className="text-slate-400 italic font-sans">No tax registration recorded (Retail Consumer)</span>
                )}
              </span>
            </div>

            {/* Address */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 font-medium block">Address & Location</span>
              {viewingCustomer.address && (
                <p className="text-slate-800 font-medium">{viewingCustomer.address}</p>
              )}
              <p className="text-slate-600">
                {[viewingCustomer.city, viewingCustomer.state, viewingCustomer.postal_code]
                  .filter(Boolean)
                  .join(', ') || <span className="text-slate-400 italic">No geographic location recorded</span>}
              </p>
            </div>

            {/* Notes */}
            {viewingCustomer.notes && (
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-xs">
                <span className="text-amber-800 font-semibold block mb-0.5">Customer Notes</span>
                <p className="text-amber-900 leading-relaxed">{viewingCustomer.notes}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span>Created: {new Date(viewingCustomer.created_at).toLocaleDateString()}</span>
              <span>Last updated: {new Date(viewingCustomer.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          7. Confirm Delete Dialog
          ========================================================================= */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
          setCustomerToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete customer "${customerToDelete?.name}" (${customerToDelete?.customer_code})? If this customer has existing sales or transactions, deletion will be blocked and deactivating is recommended.`}
        confirmText="Delete Customer"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default CustomersPage

