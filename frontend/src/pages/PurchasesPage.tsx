import React, { useState, useEffect, useCallback } from 'react'
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Building2,
  FileText,
  DollarSign,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Receipt,
  RotateCcw,
  BookOpen,
  Eye,
  Trash2,
  CreditCard,
  Printer,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table'
import { useNotification } from '../context/NotificationContext'
import purchaseService from '../services/purchaseService'
import supplierService from '../services/supplierService'
import productService from '../services/productService'
import type {
  GoodsReceiptNote,
  PurchaseInvoice,
  PurchaseOrder,
  PurchasePayment,
  PurchaseReturn,
  PurchaseStats,
  SupplierLedgerReport,
} from '../types/purchases'
import type { Supplier } from '../types/suppliers'
import type { Product } from '../types/products'
import { cn } from '../utils/cn'

type PurchaseTab =
  | 'dashboard'
  | 'suppliers'
  | 'orders'
  | 'grn'
  | 'invoices'
  | 'payments'
  | 'returns'
  | 'ledger'

export const PurchasesPage: React.FC = () => {
  const { showNotification } = useNotification()
  const [activeTab, setActiveTab] = useState<PurchaseTab>('dashboard')

  // Data states
  const [stats, setStats] = useState<PurchaseStats | null>(null)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([])
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [payments, setPayments] = useState<PurchasePayment[]>([])
  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [ledgerReport, setLedgerReport] = useState<SupplierLedgerReport | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<{ id: number; name: string; branch_code: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')

  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PurchaseOrder | null>(null)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<PurchaseInvoice | null>(null)

  // PO Form Line Items
  const [poForm, setPoForm] = useState({
    branch_id: '1',
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
    items: [
      { product_id: '', ordered_quantity: '10', unit_cost: '100', discount_rate: '0', tax_rate: '5' },
    ],
  })

  // GRN Form
  const [grnForm, setGrnForm] = useState({
    branch_id: '1',
    supplier_id: '',
    purchase_order_id: '',
    supplier_invoice_number: '',
    remarks: '',
    items: [
      {
        product_id: '',
        received_quantity: '10',
        accepted_quantity: '10',
        damaged_quantity: '0',
        rejected_quantity: '0',
        unit_cost: '100',
        batch_number: '',
        expiry_date: '',
      },
    ],
  })

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    purchase_invoice_id: '',
    amount: '',
    payment_method: 'bank_transfer' as const,
    transaction_reference: '',
    notes: '',
  })

  // Return Form
  const [returnForm, setReturnForm] = useState({
    branch_id: '1',
    supplier_id: '',
    reason: 'Damaged packaging / quality rejected',
    items: [
      { product_id: '', quantity: '2', unit_cost: '100', tax_rate: '5' },
    ],
  })

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    tax_number: '',
    address: '',
    city: '',
    state: '',
  })

  // Load Metadata
  const loadMetadata = useCallback(async () => {
    try {
      const [meta, suppRes, prodRes] = await Promise.all([
        productService.getMeta(),
        supplierService.getSuppliers({ per_page: 50 }),
        productService.getProducts({ per_page: 100 }),
      ])
      setBranches(meta.branches)
      setSuppliers(suppRes.items)
      setProducts(prodRes.products)
    } catch (e) {
      console.warn('Could not load purchase metadata:', e)
    }
  }, [])

  // Load Tab Data
  const loadTabData = useCallback(async () => {
    try {
      setIsLoading(true)
      if (activeTab === 'dashboard') {
        const [st, ord] = await Promise.all([
          purchaseService.getDashboardStats(),
          purchaseService.getOrders({ per_page: 5 }),
        ])
        setStats(st)
        setOrders(ord.items)
      } else if (activeTab === 'suppliers') {
        const res = await supplierService.getSuppliers({ search: searchQuery, per_page: 25 })
        setSuppliers(res.items)
      } else if (activeTab === 'orders') {
        const res = await purchaseService.getOrders({
          search: searchQuery,
          status: statusFilter,
          supplier_id: selectedSupplierId ? Number(selectedSupplierId) : undefined,
          per_page: 20,
        })
        setOrders(res.items)
      } else if (activeTab === 'grn') {
        const res = await purchaseService.getGoodsReceipts({ per_page: 20 })
        setGrns(res.items)
      } else if (activeTab === 'invoices') {
        const res = await purchaseService.getInvoices({ per_page: 20 })
        setInvoices(res.items)
      } else if (activeTab === 'payments') {
        const res = await purchaseService.getPayments({ per_page: 20 })
        setPayments(res.items)
      } else if (activeTab === 'returns') {
        const res = await purchaseService.getReturns({ per_page: 20 })
        setReturns(res.items)
      } else if (activeTab === 'ledger') {
        if (selectedSupplierId) {
          const res = await purchaseService.getSupplierLedger(selectedSupplierId)
          setLedgerReport(res)
        } else if (suppliers.length > 0) {
          const firstId = suppliers[0].id
          setSelectedSupplierId(String(firstId))
          const res = await purchaseService.getSupplierLedger(firstId)
          setLedgerReport(res)
        }
      }
    } catch (err) {
      console.error('Error loading purchase data:', err)
      showNotification({ title: 'Error', message: (err as Error).message, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, statusFilter, selectedSupplierId, suppliers, showNotification])

  useEffect(() => {
    loadMetadata()
  }, [loadMetadata])

  useEffect(() => {
    loadTabData()
  }, [loadTabData])

  // Handlers
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poForm.supplier_id || poForm.items.length === 0 || !poForm.items[0].product_id) {
      showNotification({ title: 'Validation', message: 'Supplier and at least 1 product line item are required', type: 'error' })
      return
    }

    try {
      await purchaseService.createOrder({
        branch_id: Number(poForm.branch_id),
        supplier_id: Number(poForm.supplier_id),
        order_date: poForm.order_date,
        expected_delivery_date: poForm.expected_delivery_date || undefined,
        notes: poForm.notes,
        items: poForm.items.map((it) => ({
          product_id: Number(it.product_id),
          ordered_quantity: Number(it.ordered_quantity),
          unit_cost: Number(it.unit_cost),
          discount_rate: Number(it.discount_rate || 0),
          tax_rate: Number(it.tax_rate || 0),
        })),
      })
      showNotification({ title: 'Success', message: 'Purchase Order created!', type: 'success' })
      setIsOrderModalOpen(false)
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grnForm.supplier_id || !grnForm.items[0].product_id) {
      showNotification({ title: 'Validation', message: 'Supplier and valid received items are required', type: 'error' })
      return
    }

    try {
      await purchaseService.recordGoodsReceipt({
        branch_id: Number(grnForm.branch_id),
        supplier_id: Number(grnForm.supplier_id),
        purchase_order_id: grnForm.purchase_order_id ? Number(grnForm.purchase_order_id) : undefined,
        supplier_invoice_number: grnForm.supplier_invoice_number || undefined,
        remarks: grnForm.remarks,
        items: grnForm.items.map((it) => ({
          product_id: Number(it.product_id),
          received_quantity: Number(it.received_quantity),
          accepted_quantity: Number(it.accepted_quantity),
          damaged_quantity: Number(it.damaged_quantity || 0),
          rejected_quantity: Number(it.rejected_quantity || 0),
          unit_cost: Number(it.unit_cost),
          batch_number: it.batch_number || undefined,
          expiry_date: it.expiry_date || undefined,
        })),
      })
      showNotification({
        title: 'GRN Processed',
        message: 'Accepted quantities added to stock. Damaged items recorded separately.',
        type: 'success',
      })
      setIsGrnModalOpen(false)
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.purchase_invoice_id || !paymentForm.amount) {
      showNotification({ title: 'Validation', message: 'Invoice and payment amount are required', type: 'error' })
      return
    }

    try {
      await purchaseService.recordPayment({
        purchase_invoice_id: Number(paymentForm.purchase_invoice_id),
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference,
        notes: paymentForm.notes,
      })
      showNotification({ title: 'Payment Recorded', message: 'Supplier balance and invoice status updated!', type: 'success' })
      setIsPaymentModalOpen(false)
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!returnForm.supplier_id || !returnForm.items[0].product_id) {
      showNotification({ title: 'Validation', message: 'Supplier and returned items are required', type: 'error' })
      return
    }

    try {
      await purchaseService.recordReturn({
        branch_id: Number(returnForm.branch_id),
        supplier_id: Number(returnForm.supplier_id),
        reason: returnForm.reason,
        items: returnForm.items.map((it) => ({
          product_id: Number(it.product_id),
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
          tax_rate: Number(it.tax_rate || 0),
        })),
      })
      showNotification({ title: 'Return Recorded', message: 'Inventory deducted and supplier ledger debited!', type: 'success' })
      setIsReturnModalOpen(false)
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierForm.name || !supplierForm.phone) {
      showNotification({ title: 'Validation', message: 'Supplier name and phone are required', type: 'error' })
      return
    }

    try {
      await supplierService.createSupplier({
        name: supplierForm.name,
        contact_person: supplierForm.contact_person,
        phone: supplierForm.phone,
        email: supplierForm.email,
        tax_number: supplierForm.tax_number,
        address: supplierForm.address,
        city: supplierForm.city,
        state: supplierForm.state,
        is_active: true,
      })
      showNotification({ title: 'Success', message: 'Supplier registered successfully!', type: 'success' })
      setIsSupplierModalOpen(false)
      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', tax_number: '', address: '', city: '', state: '' })
      loadMetadata()
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Purchase & Supplier Management"
        subtitle="End-to-end procurement workflow: PO → Goods Receipt (GRN) → Invoices → Payments → Returns"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsSupplierModalOpen(true)}>
              <Building2 className="w-4 h-4 mr-1 text-slate-600" />
              Add Supplier
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsGrnModalOpen(true)}>
              <Package className="w-4 h-4 mr-1 text-emerald-600" />
              Goods Receipt (GRN)
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsReturnModalOpen(true)}>
              <RotateCcw className="w-4 h-4 mr-1 text-rose-600" />
              Purchase Return
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsOrderModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Purchase Order
            </Button>
          </div>
        }
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 bg-white p-1 rounded-xl shadow-xs">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Truck },
          { id: 'suppliers', label: 'Suppliers Directory', icon: Building2 },
          { id: 'orders', label: 'Purchase Orders', icon: FileText },
          { id: 'grn', label: 'Goods Receipts (GRN)', icon: Package },
          { id: 'invoices', label: 'Purchase Invoices', icon: Receipt },
          { id: 'payments', label: 'Supplier Payments', icon: CreditCard },
          { id: 'returns', label: 'Purchase Returns', icon: RotateCcw },
          { id: 'ledger', label: 'Supplier Ledger', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PurchaseTab)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                isActive
                  ? 'bg-[#D45060] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Total Purchases</span>
                <DollarSign className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ₹{stats.total_purchases_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{stats.total_orders_count} orders created</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Total Paid</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                ₹{stats.total_paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Disbursed to suppliers</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Supplier Outstanding</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                ₹{stats.total_outstanding_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-rose-600 font-semibold mt-1">Pending payments liability</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Open Purchase Orders</span>
                <Truck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                {stats.open_orders_count} Orders
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{stats.pending_grns_count} partially received</p>
            </Card>
          </div>

          {/* Recent Orders Overview */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Recent Purchase Orders</h3>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>
                View All Orders →
              </Button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                        No purchase orders recorded yet. Click 'Create Purchase Order' to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-800">{po.po_number}</TableCell>
                        <TableCell className="text-xs font-medium">{po.supplier?.name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{po.order_date}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">₹{po.total_amount}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={po.status === 'received' ? 'success' : po.status === 'partially_received' ? 'warning' : 'neutral'}>
                            {po.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search vendor name, phone, GST..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button size="sm" onClick={() => setIsSupplierModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Vendor
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Code / Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone / Email</TableHead>
                  <TableHead>GSTIN / Tax ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      No suppliers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-bold text-xs text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.supplier_code}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{s.contact_person || '—'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="text-slate-800">{s.phone}</div>
                        <div className="text-[11px] text-slate-400">{s.email}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{s.tax_number || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{s.city ? `${s.city}, ${s.state}` : '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSupplierId(String(s.id))
                            setActiveTab('ledger')
                          }}
                        >
                          <BookOpen className="w-3 h-3 mr-1 text-indigo-600" />
                          Ledger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 3: PURCHASE ORDERS LIST */}
      {activeTab === 'orders' && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search PO number, supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border rounded-lg p-2 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partially_received">Partially Received</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button size="sm" onClick={() => setIsOrderModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New PO
              </Button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      No purchase orders match your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">{po.po_number}</TableCell>
                      <TableCell className="text-xs font-medium">{po.supplier?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{po.branch?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{po.order_date}</TableCell>
                      <TableCell className="text-right text-xs font-mono">₹{po.subtotal}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-500">₹{po.tax_amount}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-slate-900">₹{po.total_amount}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={po.status === 'received' ? 'success' : po.status === 'partially_received' ? 'warning' : 'neutral'}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {po.status !== 'received' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setGrnForm({
                                ...grnForm,
                                supplier_id: String(po.supplier_id),
                                branch_id: String(po.branch_id),
                                purchase_order_id: String(po.id),
                                items: (po.items || []).map((it) => ({
                                  product_id: String(it.product_id),
                                  received_quantity: String(it.ordered_quantity - it.received_quantity),
                                  accepted_quantity: String(it.ordered_quantity - it.received_quantity),
                                  damaged_quantity: '0',
                                  rejected_quantity: '0',
                                  unit_cost: String(it.unit_cost),
                                  batch_number: '',
                                  expiry_date: '',
                                })),
                              })
                              setIsGrnModalOpen(true)
                            }}
                          >
                            <Package className="w-3 h-3 mr-1 text-emerald-600" />
                            Receive GRN
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 4: GOODS RECEIPTS (GRN) */}
      {activeTab === 'grn' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Goods Receipt Notes (GRN)</h3>
            <Button size="sm" onClick={() => setIsGrnModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New GRN
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>PO Linked</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead>Items Received</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No Goods Receipt Notes created yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  grns.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">{g.grn_number}</TableCell>
                      <TableCell className="text-xs font-medium">{g.supplier?.name}</TableCell>
                      <TableCell className="text-xs">{g.branch?.name}</TableCell>
                      <TableCell className="text-xs font-mono">{g.purchaseOrder?.po_number || 'Direct Delivery'}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(g.receipt_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs">{g.items?.length ?? 1} Line items</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success">{g.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 5: PURCHASE INVOICES */}
      {activeTab === 'invoices' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Purchase Invoices & Billing</h3>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-center">Payment Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      No purchase invoices found. Invoices are automatically generated upon GRN acceptance.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const due = Number(inv.total_amount) - Number(inv.paid_amount)
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-800">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs font-medium">{inv.supplier?.name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{inv.invoice_date}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">₹{inv.total_amount}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600">₹{inv.paid_amount}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-600 font-bold">₹{due.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={inv.payment_status === 'paid' ? 'success' : inv.payment_status === 'partially_paid' ? 'warning' : 'danger'}>
                            {inv.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.payment_status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoiceForPayment(inv)
                                setPaymentForm({
                                  purchase_invoice_id: String(inv.id),
                                  amount: String(due),
                                  payment_method: 'bank_transfer',
                                  transaction_reference: '',
                                  notes: '',
                                })
                                setIsPaymentModalOpen(true)
                              }}
                            >
                              <CreditCard className="w-3 h-3 mr-1 text-emerald-600" />
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 6: SUPPLIER PAYMENTS */}
      {activeTab === 'payments' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Supplier Payment Disbursements</h3>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice Linked</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No supplier payments recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">{p.payment_number}</TableCell>
                      <TableCell className="text-xs font-medium">{p.supplier?.name}</TableCell>
                      <TableCell className="text-xs font-mono">{p.invoice?.invoice_number}</TableCell>
                      <TableCell className="text-xs text-slate-500">{p.payment_date}</TableCell>
                      <TableCell>
                        <Badge variant="neutral" className="uppercase text-[10px]">{p.payment_method}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">{p.transaction_reference || '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">₹{p.amount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 7: PURCHASE RETURNS */}
      {activeTab === 'returns' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Purchase Returns to Suppliers</h3>
            <Button size="sm" onClick={() => setIsReturnModalOpen(true)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              New Return
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Credit Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No purchase returns recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">{r.return_number}</TableCell>
                      <TableCell className="text-xs font-medium">{r.supplier?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.branch?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.return_date}</TableCell>
                      <TableCell className="text-xs text-slate-600">{r.reason}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-rose-600">₹{r.total_amount}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success">{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 8: SUPPLIER LEDGER STATEMENT */}
      {activeTab === 'ledger' && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="text-xs border rounded-lg p-2 bg-white text-slate-800 font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
                ))}
              </select>
            </div>
            {ledgerReport && (
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[11px] text-slate-500">Invoiced Purchases</div>
                  <div className="text-base font-bold text-slate-800">₹{ledgerReport.total_invoiced.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Disbursed Payments</div>
                  <div className="text-base font-bold text-emerald-600">₹{ledgerReport.total_paid.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Net Payable Balance</div>
                  <div className="text-lg font-bold text-rose-600">₹{ledgerReport.current_balance.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit (Payment/Return)</TableHead>
                  <TableHead className="text-right">Credit (Invoice)</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!ledgerReport || ledgerReport.ledger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      No statement ledger transactions for this supplier yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerReport.ledger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-slate-500">{entry.transaction_date}</TableCell>
                      <TableCell>
                        <Badge variant="neutral" className="uppercase text-[10px]">{entry.transaction_type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{entry.description || '—'}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-emerald-600">
                        {Number(entry.debit) > 0 ? `₹${entry.debit}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-800 font-semibold">
                        {Number(entry.credit) > 0 ? `₹${entry.credit}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-rose-600">
                        ₹{entry.running_balance}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* MODAL 1: CREATE PURCHASE ORDER */}
      <Modal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} title="Create Purchase Order (PO)" maxWidth="lg">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
              <select
                value={poForm.supplier_id}
                onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Branch</label>
              <select
                value={poForm.branch_id}
                onChange={(e) => setPoForm({ ...poForm, branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date</label>
              <Input
                type="date"
                value={poForm.order_date}
                onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery</label>
              <Input
                type="date"
                value={poForm.expected_delivery_date}
                onChange={(e) => setPoForm({ ...poForm, expected_delivery_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Items</label>
            {poForm.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-2">
                <div className="col-span-2">
                  <select
                    value={it.product_id}
                    onChange={(e) => {
                      const newItems = [...poForm.items]
                      newItems[idx].product_id = e.target.value
                      const selProd = products.find((p) => p.id === Number(e.target.value))
                      if (selProd) {
                        newItems[idx].unit_cost = String(selProd.cost_price)
                        newItems[idx].tax_rate = String(selProd.tax_rate ?? 5)
                      }
                      setPoForm({ ...poForm, items: newItems })
                    }}
                    className="w-full text-xs border rounded-lg p-1.5 bg-white"
                    required
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={it.ordered_quantity}
                    onChange={(e) => {
                      const newItems = [...poForm.items]
                      newItems[idx].ordered_quantity = e.target.value
                      setPoForm({ ...poForm, items: newItems })
                    }}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Cost (₹)"
                    value={it.unit_cost}
                    onChange={(e) => {
                      const newItems = [...poForm.items]
                      newItems[idx].unit_cost = e.target.value
                      setPoForm({ ...poForm, items: newItems })
                    }}
                    required
                  />
                </div>
                <div className="text-right text-xs font-bold font-mono">
                  ₹{(Number(it.ordered_quantity || 0) * Number(it.unit_cost || 0)).toFixed(2)}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setPoForm({
                  ...poForm,
                  items: [...poForm.items, { product_id: '', ordered_quantity: '1', unit_cost: '0', discount_rate: '0', tax_rate: '5' }],
                })
              }
              className="text-xs text-[#D45060] font-bold hover:underline cursor-pointer"
            >
              + Add Line Item
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsOrderModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Purchase Order</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: GOODS RECEIPT (GRN) */}
      <Modal isOpen={isGrnModalOpen} onClose={() => setIsGrnModalOpen(false)} title="Goods Receipt (GRN) Processing" maxWidth="lg">
        <form onSubmit={handleCreateGrn} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
              <select
                value={grnForm.supplier_id}
                onChange={(e) => setGrnForm({ ...grnForm, supplier_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice #</label>
              <Input
                placeholder="e.g. VEND-INV-9821"
                value={grnForm.supplier_invoice_number}
                onChange={(e) => setGrnForm({ ...grnForm, supplier_invoice_number: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900">
            <strong>Inventory Rule:</strong> Stock quantity will be incremented <u>only</u> for the <strong>Accepted Quantity</strong>. Damaged quantities are recorded separately in audit logs.
          </div>

          {grnForm.items.map((it, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product</label>
                  <select
                    value={it.product_id}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].product_id = e.target.value
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                    className="w-full text-xs border rounded-lg p-1.5 bg-white"
                    required
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Batch Number (Optional)</label>
                  <Input
                    placeholder="BATCH-001"
                    value={it.batch_number}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].batch_number = e.target.value
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500">Received Qty</label>
                  <Input
                    type="number"
                    value={it.received_quantity}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].received_quantity = e.target.value
                      newItems[idx].accepted_quantity = e.target.value
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-emerald-700 font-bold">Accepted Qty</label>
                  <Input
                    type="number"
                    value={it.accepted_quantity}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].accepted_quantity = e.target.value
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-rose-600">Damaged Qty</label>
                  <Input
                    type="number"
                    value={it.damaged_quantity}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].damaged_quantity = e.target.value
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600">Unit Cost (₹)</label>
                  <Input
                    type="number"
                    value={it.unit_cost}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].unit_cost = e.target.value
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsGrnModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Process Goods Receipt</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: SUPPLIER PAYMENT */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Supplier Payment">
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice</label>
            <Input
              value={selectedInvoiceForPayment ? `${selectedInvoiceForPayment.invoice_number} (Due: ₹${Number(selectedInvoiceForPayment.total_amount) - Number(selectedInvoiceForPayment.paid_amount)})` : ''}
              disabled
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
              <Input
                type="number"
                step="any"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as any })}
                className="w-full text-xs border rounded-lg p-2"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">UPI / QR</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference / UTR</label>
            <Input
              placeholder="e.g. UTR-872619827"
              value={paymentForm.transaction_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Confirm Disbursement</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: PURCHASE RETURN */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Record Purchase Return">
        <form onSubmit={handleCreateReturn} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
              <select
                value={returnForm.supplier_id}
                onChange={(e) => setReturnForm({ ...returnForm, supplier_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={returnForm.branch_id}
                onChange={(e) => setReturnForm({ ...returnForm, branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Return</label>
            <Input
              value={returnForm.reason}
              onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
              required
            />
          </div>

          {returnForm.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="col-span-2">
                <select
                  value={it.product_id}
                  onChange={(e) => {
                    const newItems = [...returnForm.items]
                    newItems[idx].product_id = e.target.value
                    const selProd = products.find((p) => p.id === Number(e.target.value))
                    if (selProd) {
                      newItems[idx].unit_cost = String(selProd.cost_price)
                    }
                    setReturnForm({ ...returnForm, items: newItems })
                  }}
                  className="w-full text-xs border rounded-lg p-1.5 bg-white"
                  required
                >
                  <option value="">Select Product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Qty"
                  value={it.quantity}
                  onChange={(e) => {
                    const newItems = [...returnForm.items]
                    newItems[idx].quantity = e.target.value
                    setReturnForm({ ...returnForm, items: newItems })
                  }}
                  required
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Unit Cost"
                  value={it.unit_cost}
                  onChange={(e) => {
                    const newItems = [...returnForm.items]
                    newItems[idx].unit_cost = e.target.value
                    setReturnForm({ ...returnForm, items: newItems })
                  }}
                  required
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsReturnModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="bg-rose-600 hover:bg-rose-700">Confirm Return</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: NEW SUPPLIER */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Register Supplier Vendor">
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Vendor Name</label>
              <Input
                placeholder="e.g. AgriFresh Wholesale Corp"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <Input
                placeholder="e.g. Rajesh Kumar"
                value={supplierForm.contact_person}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <Input
                placeholder="+91 98765 00000"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                placeholder="sales@vendor.com"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <Input
                placeholder="29AABCB1234F1Z1"
                value={supplierForm.tax_number}
                onChange={(e) => setSupplierForm({ ...supplierForm, tax_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <Input
                placeholder="Warehouse 4, APMC Market"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <Input
                placeholder="Bangalore"
                value={supplierForm.city}
                onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <Input
                placeholder="Karnataka"
                value={supplierForm.state}
                onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsSupplierModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Supplier</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PurchasesPage
