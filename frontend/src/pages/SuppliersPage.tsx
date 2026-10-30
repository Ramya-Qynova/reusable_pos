import React, { useState, useEffect, useCallback, useId } from 'react'
import {
  Building2,
  Plus,
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
  User,
  ToggleLeft,
  ToggleRight,
  Truck,
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
import supplierService from '../services/supplierService'
import type { Supplier, SupplierFormData, SupplierPaginationMeta } from '../types/suppliers'
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

export const SuppliersPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const supplierAddressId = useId()
  const supplierNotesId = useId()

  // Permissions: Backend enforces CheckPermission('suppliers.manage')
  const canManage = user?.is_super_admin || true

  // Data states
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [meta, setMeta] = useState<SupplierPaginationMeta>({
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const initialFormData: SupplierFormData = {
    supplier_code: '',
    name: '',
    contact_person: '',
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
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch Suppliers
  const loadSuppliers = useCallback(async () => {
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

      const res = await supplierService.getSuppliers(params)
      setSuppliers(res.items)
      if (res.meta) {
        setMeta(res.meta)
      }
    } catch (err) {
      showNotification({
        title: 'Failed to load suppliers',
        message: extractErrorMessage(err, 'Could not retrieve suppliers list.'),
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchQuery, statusFilter, cityFilter, showNotification])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

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
    setEditingSupplier(null)
    setFormErrors({})
    try {
      const nextCode = await supplierService.getNextCode().catch(() => '')
      setFormData({
        ...initialFormData,
        supplier_code: nextCode,
      })
    } catch {
      setFormData(initialFormData)
    }
    setIsFormModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup)
    setFormErrors({})
    setFormData({
      supplier_code: sup.supplier_code,
      name: sup.name,
      contact_person: sup.contact_person || '',
      phone: sup.phone,
      alternate_phone: sup.alternate_phone || '',
      email: sup.email || '',
      address: sup.address || '',
      city: sup.city || '',
      state: sup.state || '',
      postal_code: sup.postal_code || '',
      tax_number: sup.tax_number || '',
      notes: sup.notes || '',
      is_active: sup.is_active,
    })
    setIsFormModalOpen(true)
  }

  // View Supplier
  const handleOpenViewModal = (sup: Supplier) => {
    setViewingSupplier(sup)
  }

  // Save Supplier (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validations
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Supplier name is required.'
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

      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, formData)
        showNotification({
          title: 'Supplier Updated',
          message: `Supplier "${formData.name}" was updated successfully.`,
          type: 'success',
        })
      } else {
        await supplierService.createSupplier(formData)
        showNotification({
          title: 'Supplier Created',
          message: `Supplier "${formData.name}" has been registered successfully.`,
          type: 'success',
        })
      }

      setIsFormModalOpen(false)
      loadSuppliers()
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Failed to save supplier.')
      showNotification({
        title: 'Error Saving Supplier',
        message: errorMsg,
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Status
  const handleToggleStatus = async (sup: Supplier) => {
    try {
      const updated = await supplierService.toggleStatus(sup.id)
      setSuppliers((prev) => prev.map((s) => (s.id === sup.id ? updated : s)))
      if (viewingSupplier && viewingSupplier.id === sup.id) {
        setViewingSupplier(updated)
      }
      showNotification({
        title: 'Status Updated',
        message: `Supplier "${sup.name}" marked as ${updated.is_active ? 'Active' : 'Inactive'}.`,
        type: 'info',
      })
    } catch (err) {
      showNotification({
        title: 'Status Update Failed',
        message: extractErrorMessage(err, 'Could not change supplier status.'),
        type: 'error',
      })
    }
  }

  // Delete Supplier
  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return
    try {
      setIsSubmitting(true)
      await supplierService.deleteSupplier(supplierToDelete.id)
      showNotification({
        title: 'Supplier Deleted',
        message: `Supplier "${supplierToDelete.name}" was removed successfully.`,
        type: 'success',
      })
      setIsDeleteConfirmOpen(false)
      setSupplierToDelete(null)
      loadSuppliers()
    } catch (err) {
      showNotification({
        title: 'Deletion Blocked',
        message: extractErrorMessage(
          err,
          'Cannot delete supplier because they are referenced in purchase or payment records. Deactivate instead.'
        ),
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary Metrics
  const activeCount = suppliers.filter((s) => s.is_active).length
  const inactiveCount = suppliers.filter((s) => !s.is_active).length
  const taxIdCount = suppliers.filter((s) => !!s.tax_number).length

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title="Suppliers Master"
        subtitle="Manage supplier profiles, procurement vendor directory, and contact information across all branches."
        actions={
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </Button>
        }
      />

      {/* 2. Quick Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-slate-200/90 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Vendors</p>
            <p className="text-xl font-bold text-slate-800">{meta.total}</p>
          </div>
        </Card>

        <Card className="p-3 border-slate-200/90 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Vendors</p>
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
            <FileText className="w-5 h-5" />
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
              placeholder="Search by supplier name, contact person, code, phone, or email..."
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
              onClick={loadSuppliers}
              disabled={isLoading}
              title="Refresh suppliers list"
              className="p-1.5"
            >
              <RefreshCw className={cn('w-4 h-4 text-slate-600', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Suppliers Data Table */}
      <Card className="overflow-hidden shadow-xs border-slate-200/90">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/75 border-b border-slate-200">
                <TableHead className="w-28 font-bold text-slate-700">Code</TableHead>
                <TableHead className="font-bold text-slate-700">Supplier Name</TableHead>
                <TableHead className="font-bold text-slate-700">Contact Person</TableHead>
                <TableHead className="font-bold text-slate-700">Contact</TableHead>
                <TableHead className="font-bold text-slate-700">Location / Tax ID</TableHead>
                <TableHead className="w-24 text-center font-bold text-slate-700">Status</TableHead>
                <TableHead className="w-32 text-right font-bold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#D45060]" />
                      <span className="text-xs font-medium">Loading suppliers directory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44">
                    <EmptyState
                      title="No suppliers found"
                      description={
                        searchQuery
                          ? `No supplier matches query "${searchQuery}". Try a different keyword.`
                          : 'There are currently no suppliers in this view. Click Add Supplier to create one.'
                      }
                      action={
                        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add Supplier
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((sup) => (
                  <TableRow
                    key={sup.id}
                    className="hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    {/* Supplier Code */}
                    <TableCell className="font-mono text-xs font-semibold text-slate-700">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80">
                        {sup.supplier_code}
                      </span>
                    </TableCell>

                    {/* Supplier Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-snug">{sup.name}</p>
                          {sup.email && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-300" />
                              {sup.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Person */}
                    <TableCell>
                      {sup.contact_person ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{sup.contact_person}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Direct Business</span>
                      )}
                    </TableCell>

                    {/* Contact Phone */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{sup.phone}</span>
                        </p>
                        {sup.alternate_phone && (
                          <p className="text-[11px] text-slate-400 pl-5">
                            Alt: {sup.alternate_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Location & Tax ID */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {sup.city && (
                          <p className="flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {sup.city}
                            {sup.state ? `, ${sup.state}` : ''}
                          </p>
                        )}
                        {sup.tax_number ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            {sup.tax_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unregistered Vendor</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="text-center">
                      {sup.is_active ? (
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
                          onClick={() => handleOpenViewModal(sup)}
                          title="View supplier details"
                          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(sup)}
                          title="Edit supplier details"
                          className="p-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(sup)}
                          title={sup.is_active ? 'Deactivate supplier' : 'Activate supplier'}
                          className={cn(
                            'p-1 rounded-md transition-colors cursor-pointer',
                            sup.is_active
                              ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          )}
                        >
                          {sup.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSupplierToDelete(sup)
                            setIsDeleteConfirmOpen(true)
                          }}
                          title="Delete supplier safely"
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
          5. Create / Edit Supplier Modal
          ========================================================================= */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Register New Supplier'}
        subtitle="Supplier records are shared across all installation branches."
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
                <span>Active Vendor</span>
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
                {editingSupplier ? 'Update Supplier' : 'Register Supplier'}
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
                label="Supplier Code"
                placeholder="Auto (SUP-XXXXX)"
                value={formData.supplier_code}
                onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                error={formErrors.supplier_code}
                helperText="Leave empty to auto-generate"
              />
            </div>
            <div className="sm:col-span-8">
              <Input
                label="Supplier / Business Name *"
                placeholder="Vendor company or trader name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                required
              />
            </div>
          </div>

          {/* Row 2: Contact Person & Primary Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Contact Person"
                placeholder="Primary account manager / representative"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Primary Phone *"
                placeholder="+91 98765 11223"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={formErrors.phone}
                required
              />
            </div>
          </div>

          {/* Row 3: Alternate Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Alternative Phone"
                placeholder="Orders desk / dispatch hotline"
                value={formData.alternate_phone}
                onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="orders@vendor.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={formErrors.email}
              />
            </div>
          </div>

          {/* Row 4: Address */}
          <div>
            <label htmlFor={supplierAddressId} className="block text-xs font-medium text-slate-700 mb-1">
              Vendor / Warehouse Address
            </label>
            <textarea
              id={supplierAddressId}
              rows={2}
              placeholder="Unit, godown number, industrial area, street..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#D45060] focus:outline-none focus:ring-2 focus:ring-[#D45060]/20 transition-colors"
            />
          </div>

          {/* Row 5: City, State, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                label="City"
                placeholder="e.g. Coimbatore"
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
                placeholder="e.g. 641001"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
          </div>

          {/* Row 6: GSTIN / Tax ID & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="GSTIN / Tax Registration Number"
                placeholder="e.g. 33AABCS8901N1Z2"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value.toUpperCase() })}
                helperText="Official tax registration identifier"
              />
            </div>
            <div>
              <label htmlFor={supplierNotesId} className="block text-xs font-medium text-slate-700 mb-1">
                Internal Vendor Notes
              </label>
              <input
                id={supplierNotesId}
                type="text"
                placeholder="Payment terms, delivery schedules, categories..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#D45060] focus:outline-none focus:ring-2 focus:ring-[#D45060]/20 transition-colors"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          6. View Supplier Details Modal
          ========================================================================= */}
      {viewingSupplier && (
        <Modal
          isOpen={!!viewingSupplier}
          onClose={() => setViewingSupplier(null)}
          title="Supplier Dossier"
          subtitle={`Master record: ${viewingSupplier.supplier_code}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant={viewingSupplier.is_active ? 'outline' : 'primary'}
                size="sm"
                onClick={() => handleToggleStatus(viewingSupplier)}
              >
                {viewingSupplier.is_active ? 'Deactivate Supplier' : 'Activate Supplier'}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sup = viewingSupplier
                    setViewingSupplier(null)
                    handleOpenEditModal(sup)
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit Supplier
                </Button>
                <Button variant="primary" size="sm" onClick={() => setViewingSupplier(null)}>
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
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 font-bold text-base flex items-center justify-center border border-blue-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base leading-tight">
                    {viewingSupplier.name}
                  </h4>
                  <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                    {viewingSupplier.supplier_code}
                  </p>
                </div>
              </div>
              <Badge variant={viewingSupplier.is_active ? 'success' : 'neutral'} size="md" dot>
                {viewingSupplier.is_active ? 'Active Vendor' : 'Inactive Vendor'}
              </Badge>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium block mb-1">Contact Person</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {viewingSupplier.contact_person || <span className="text-slate-400 italic">Not specified</span>}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium block mb-1">Primary Phone</span>
                <span className="font-semibold text-slate-800 text-sm">{viewingSupplier.phone}</span>
                {viewingSupplier.alternate_phone && (
                  <span className="text-slate-500 block mt-0.5">
                    Alt: {viewingSupplier.alternate_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Email & Tax */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium block mb-1">Email Address</span>
                <span className="font-semibold text-slate-800 text-xs break-all">
                  {viewingSupplier.email || <span className="text-slate-400 italic">Not specified</span>}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium block mb-1">GSTIN / Tax ID</span>
                <span className="font-mono font-semibold text-slate-800 text-xs">
                  {viewingSupplier.tax_number || <span className="text-slate-400 italic font-sans">Unregistered</span>}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 font-medium block">Warehouse / Office Location</span>
              {viewingSupplier.address && (
                <p className="text-slate-800 font-medium">{viewingSupplier.address}</p>
              )}
              <p className="text-slate-600">
                {[viewingSupplier.city, viewingSupplier.state, viewingSupplier.postal_code]
                  .filter(Boolean)
                  .join(', ') || <span className="text-slate-400 italic">No geographic location recorded</span>}
              </p>
            </div>

            {/* Notes */}
            {viewingSupplier.notes && (
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-xs">
                <span className="text-amber-800 font-semibold block mb-0.5">Vendor Terms & Notes</span>
                <p className="text-amber-900 leading-relaxed">{viewingSupplier.notes}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span>Created: {new Date(viewingSupplier.created_at).toLocaleDateString()}</span>
              <span>Last updated: {new Date(viewingSupplier.updated_at).toLocaleDateString()}</span>
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
          setSupplierToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier Profile"
        message={`Are you sure you want to delete supplier "${supplierToDelete?.name}" (${supplierToDelete?.supplier_code})? If this vendor is referenced in purchase orders or goods receipt notes, deletion will be blocked and deactivating is recommended.`}
        confirmText="Delete Supplier"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default SuppliersPage

