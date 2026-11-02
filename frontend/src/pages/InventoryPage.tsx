import React, { useState, useEffect, useCallback } from 'react'
import {
  Boxes,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  ArrowRightLeft,
  Calendar,
  History,
  DollarSign,
  Search,
  Plus,
  RefreshCw,
  Building2,
  CheckCircle,
  XCircle,
  FileText,
  Printer,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table'
import { EmptyState } from '../components/common/EmptyState'
import { useNotification } from '../context/NotificationContext'
import inventoryService from '../services/inventoryService'
import productService from '../services/productService'
import type {
  BranchStock,
  BranchStockOverview,
  InventoryStats,
  StockAdjustment,
  StockBatch,
  StockMovement,
  StockTransfer,
  StockValuationReport,
} from '../types/inventory'
import type { Category, Product } from '../types/products'
import { cn } from '../utils/cn'

type InventoryTab =
  | 'dashboard'
  | 'overview'
  | 'stocks'
  | 'adjustments'
  | 'transfers'
  | 'movements'
  | 'batches'
  | 'valuation'

export const InventoryPage: React.FC = () => {
  const { showNotification } = useNotification()
  const [activeTab, setActiveTab] = useState<InventoryTab>('dashboard')

  // Data states
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [overview, setOverview] = useState<BranchStockOverview[]>([])
  const [stocks, setStocks] = useState<BranchStock[]>([])
  const [totalStocks, setTotalStocks] = useState(0)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [valuation, setValuation] = useState<StockValuationReport | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [branches, setBranches] = useState<{ id: number; name: string; branch_code: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low' | 'out' | 'damaged'>('all')
  const [movementTypeFilter, setMovementTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false)
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)

  // Form states
  const [stockInForm, setStockInForm] = useState({
    branch_id: '1',
    product_id: '',
    quantity: '',
    unit_cost: '',
    reason: 'Direct Purchase / Supplier Delivery',
    remarks: '',
  })

  const [stockOutForm, setStockOutForm] = useState({
    branch_id: '1',
    product_id: '',
    quantity: '',
    reason: 'Damaged / Write-off / Internal Use',
    remarks: '',
  })

  const [adjustmentForm, setAdjustmentForm] = useState({
    branch_id: '1',
    reason: 'Physical Count Mismatch',
    type: 'addition' as 'addition' | 'subtraction' | 'damage' | 'physical_count',
    notes: '',
    product_id: '',
    quantity_adjusted: '',
    unit_cost: '',
  })

  const [transferForm, setTransferForm] = useState({
    source_branch_id: '1',
    destination_branch_id: '2',
    notes: '',
    product_id: '',
    quantity_sent: '',
  })

  const [batchForm, setBatchForm] = useState({
    branch_id: '1',
    product_id: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    quantity: '',
    cost_price: '',
    selling_price: '',
  })

  // Load Metadata
  const loadMetadata = useCallback(async () => {
    try {
      const meta = await productService.getMeta()
      setCategories(meta.categories)
      setBranches(meta.branches)
      const prodRes = await productService.getProducts({ per_page: 100 })
      setProducts(prodRes.products)
    } catch (e) {
      console.warn('Could not load metadata:', e)
    }
  }, [])

  // Load Tab Data
  const loadTabData = useCallback(async () => {
    try {
      setIsLoading(true)
      if (activeTab === 'dashboard') {
        const [st, ov] = await Promise.all([
          inventoryService.getDashboardStats(),
          inventoryService.getOverview(),
        ])
        setStats(st)
        setOverview(ov)
      } else if (activeTab === 'overview') {
        const ov = await inventoryService.getOverview()
        setOverview(ov)
      } else if (activeTab === 'stocks') {
        const res = await inventoryService.getStocks({
          search: searchQuery,
          category_id: categoryFilter,
          stock_status: stockStatusFilter,
          page: currentPage,
          per_page: 15,
        })
        setStocks(res.items)
        setTotalStocks(res.total)
      } else if (activeTab === 'adjustments') {
        // Can inspect movements or adjustment summary
        const res = await inventoryService.getMovements({ movement_type: 'adjustment', per_page: 20 })
        setMovements(res.items)
      } else if (activeTab === 'transfers') {
        const res = await inventoryService.getTransfers({ page: currentPage })
        setTransfers(res.items)
      } else if (activeTab === 'movements') {
        const res = await inventoryService.getMovements({
          movement_type: movementTypeFilter,
          per_page: 25,
        })
        setMovements(res.items)
      } else if (activeTab === 'batches') {
        const res = await inventoryService.getBatches({ search: searchQuery })
        setBatches(res.items)
      } else if (activeTab === 'valuation') {
        const res = await inventoryService.getValuation()
        setValuation(res)
      }
    } catch (err) {
      console.error('Error loading inventory tab data:', err)
      showNotification({
        title: 'Error loading data',
        message: (err as Error).message,
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, categoryFilter, stockStatusFilter, movementTypeFilter, currentPage, showNotification])

  useEffect(() => {
    loadMetadata()
  }, [loadMetadata])

  useEffect(() => {
    loadTabData()
  }, [loadTabData])

  // Handlers
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockInForm.product_id || !stockInForm.quantity) {
      showNotification({ title: 'Validation', message: 'Please select product and enter quantity', type: 'error' })
      return
    }
    try {
      await inventoryService.recordStockIn({
        branch_id: Number(stockInForm.branch_id),
        product_id: Number(stockInForm.product_id),
        quantity: Number(stockInForm.quantity),
        unit_cost: stockInForm.unit_cost ? Number(stockInForm.unit_cost) : undefined,
        reason: stockInForm.reason,
        remarks: stockInForm.remarks,
      })
      showNotification({ title: 'Success', message: 'Stock added successfully!', type: 'success' })
      setIsStockInModalOpen(false)
      setStockInForm({ branch_id: '1', product_id: '', quantity: '', unit_cost: '', reason: 'Direct Purchase', remarks: '' })
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockOutForm.product_id || !stockOutForm.quantity) {
      showNotification({ title: 'Validation', message: 'Please select product and enter quantity', type: 'error' })
      return
    }
    try {
      await inventoryService.recordStockOut({
        branch_id: Number(stockOutForm.branch_id),
        product_id: Number(stockOutForm.product_id),
        quantity: Number(stockOutForm.quantity),
        reason: stockOutForm.reason,
        remarks: stockOutForm.remarks,
      })
      showNotification({ title: 'Success', message: 'Stock issued successfully!', type: 'success' })
      setIsStockOutModalOpen(false)
      setStockOutForm({ branch_id: '1', product_id: '', quantity: '', reason: 'Write-off', remarks: '' })
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustmentForm.product_id || !adjustmentForm.quantity_adjusted) {
      showNotification({ title: 'Validation', message: 'Please select product and enter adjustment quantity', type: 'error' })
      return
    }
    try {
      await inventoryService.recordAdjustment({
        branch_id: Number(adjustmentForm.branch_id),
        reason: adjustmentForm.reason,
        type: adjustmentForm.type,
        notes: adjustmentForm.notes,
        items: [
          {
            product_id: Number(adjustmentForm.product_id),
            quantity_adjusted: Number(adjustmentForm.quantity_adjusted),
            unit_cost: adjustmentForm.unit_cost ? Number(adjustmentForm.unit_cost) : 0,
          },
        ],
      })
      showNotification({ title: 'Success', message: 'Stock adjustment recorded with audit movement!', type: 'success' })
      setIsAdjustmentModalOpen(false)
      setAdjustmentForm({
        branch_id: '1',
        reason: 'Physical Count Mismatch',
        type: 'addition',
        notes: '',
        product_id: '',
        quantity_adjusted: '',
        unit_cost: '',
      })
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferForm.product_id || !transferForm.quantity_sent) {
      showNotification({ title: 'Validation', message: 'Please select product and enter transfer quantity', type: 'error' })
      return
    }
    try {
      await inventoryService.createTransfer({
        source_branch_id: Number(transferForm.source_branch_id),
        destination_branch_id: Number(transferForm.destination_branch_id),
        notes: transferForm.notes,
        items: [
          {
            product_id: Number(transferForm.product_id),
            quantity_sent: Number(transferForm.quantity_sent),
          },
        ],
      })
      showNotification({ title: 'Success', message: 'Inter-branch transfer dispatched!', type: 'success' })
      setIsTransferModalOpen(false)
      setTransferForm({ source_branch_id: '1', destination_branch_id: '2', notes: '', product_id: '', quantity_sent: '' })
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleReceiveTransfer = async (transferId: number) => {
    try {
      await inventoryService.receiveTransfer(transferId)
      showNotification({ title: 'Success', message: 'Transfer received and destination inventory updated!', type: 'success' })
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchForm.product_id || !batchForm.batch_number || !batchForm.quantity) {
      showNotification({ title: 'Validation', message: 'Product, Batch # and Quantity are required', type: 'error' })
      return
    }
    try {
      await inventoryService.storeBatch({
        branch_id: Number(batchForm.branch_id),
        product_id: Number(batchForm.product_id),
        batch_number: batchForm.batch_number,
        manufacturing_date: batchForm.manufacturing_date || undefined,
        expiry_date: batchForm.expiry_date || undefined,
        quantity: Number(batchForm.quantity),
        cost_price: batchForm.cost_price ? Number(batchForm.cost_price) : undefined,
        selling_price: batchForm.selling_price ? Number(batchForm.selling_price) : undefined,
      })
      showNotification({ title: 'Success', message: 'Batch & Expiry record created!', type: 'success' })
      setIsBatchModalOpen(false)
      loadTabData()
    } catch (err) {
      showNotification({ title: 'Failed', message: (err as Error).message, type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Inventory & Stock Management"
        subtitle="Real-time multi-branch stock levels, movements, adjustments, and valuations"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsStockInModalOpen(true)}>
              <ArrowDownLeft className="w-4 h-4 mr-1 text-emerald-600" />
              Stock In
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsStockOutModalOpen(true)}>
              <ArrowUpRight className="w-4 h-4 mr-1 text-rose-600" />
              Stock Out
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsAdjustmentModalOpen(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1 text-amber-600" />
              Stock Adjust
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsTransferModalOpen(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-1" />
              Stock Transfer
            </Button>
          </div>
        }
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 bg-white p-1 rounded-xl shadow-xs">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Boxes },
          { id: 'overview', label: 'Branch Overview', icon: Building2 },
          { id: 'stocks', label: 'Stock List', icon: Package },
          { id: 'adjustments', label: 'Adjustments', icon: SlidersHorizontal },
          { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
          { id: 'batches', label: 'Batch & Expiry', icon: Calendar },
          { id: 'movements', label: 'Movement Ledger', icon: History },
          { id: 'valuation', label: 'Stock Valuation', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as InventoryTab)}
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
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Cost Valuation</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ₹{stats.total_valuation_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Based on purchase rates</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Retail Valuation</span>
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ₹{stats.total_valuation_retail.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                +₹{stats.potential_profit.toLocaleString('en-IN')} potential margin
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Low Stock Alerts</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                {stats.low_stock_count} Items
              </div>
              <button
                onClick={() => {
                  setStockStatusFilter('low')
                  setActiveTab('stocks')
                }}
                className="text-[11px] text-amber-700 font-semibold hover:underline mt-1 text-left"
              >
                View low stock list →
              </button>
            </Card>

            <Card className="p-4 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Out of Stock</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {stats.out_of_stock_count} Items
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{stats.damaged_units} damaged units tracked</p>
            </Card>
          </div>

          {/* Branch summary mini-cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D45060]" />
              Branch Stock Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {overview.map((b) => (
                <Card key={b.branch_id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{b.branch_name}</h4>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {b.branch_code}
                      </span>
                    </div>
                    <Badge variant={b.out_of_stock_items > 0 ? 'warning' : 'success'}>
                      {b.total_units} Units
                    </Badge>
                  </div>
                  <div className="mt-3 text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Valuation:</span>
                      <span className="font-semibold text-slate-800">₹{b.total_valuation_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Low Stock:</span>
                      <span className="text-amber-600 font-bold">{b.low_stock_items}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Out of Stock:</span>
                      <span className="text-rose-600 font-bold">{b.out_of_stock_items}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.map((b) => (
              <Card key={b.branch_id} className="p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{b.branch_name}</h4>
                      <p className="text-xs text-slate-500">{b.location || 'Branch Code: ' + b.branch_code}</p>
                    </div>
                  </div>
                  <Badge variant="neutral">{b.total_products} Skus</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-lg">
                    <div className="text-lg font-bold text-slate-800">{b.total_units}</div>
                    <div className="text-[11px] text-slate-500">In Hand Units</div>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-lg">
                    <div className="text-lg font-bold text-amber-700">{b.low_stock_items}</div>
                    <div className="text-[11px] text-amber-600">Low Stock</div>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-lg">
                    <div className="text-lg font-bold text-rose-700">{b.out_of_stock_items}</div>
                    <div className="text-[11px] text-rose-600">Out of Stock</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STOCK LIST */}
      {activeTab === 'stocks' && (
        <Card className="p-4 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search product, SKU, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="all">All Stock Levels</option>
                <option value="in_stock">In Stock (&gt; Min)</option>
                <option value="low">Low Stock Alerts</option>
                <option value="out">Out of Stock (Zero)</option>
                <option value="damaged">Damaged Units</option>
              </select>

              <Button variant="outline" size="sm" onClick={loadTabData}>
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category / Brand</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Min Level</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  <TableHead className="text-right">Damaged Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No matching stock items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  stocks.map((stk) => {
                    const qty = Number(stk.quantity)
                    const min = Number(stk.product?.minimum_stock ?? 5)
                    const isLow = qty > 0 && qty <= min
                    const isOut = qty <= 0

                    return (
                      <TableRow key={stk.id}>
                        <TableCell>
                          <div className="font-bold text-slate-900 text-xs">{stk.product?.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {stk.product?.sku} {stk.product?.barcode && `• ${stk.product.barcode}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{stk.product?.category?.name || '—'}</div>
                          <div className="text-[11px] text-slate-400">{stk.product?.brand?.name}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {stk.branch?.name}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {min} {stk.product?.unit?.short_code}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-bold">
                          <span className={cn(isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-800')}>
                            {qty} {stk.product?.unit?.short_code}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-rose-500">
                          {Number(stk.damaged_quantity) > 0 ? `${stk.damaged_quantity}` : '0'}
                        </TableCell>
                        <TableCell className="text-center">
                          {isOut ? (
                            <Badge variant="danger">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="warning">Low Stock</Badge>
                          ) : (
                            <Badge variant="success">Normal</Badge>
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

      {/* TAB 4: ADJUSTMENTS & MOVEMENTS AUDIT */}
      {(activeTab === 'adjustments' || activeTab === 'movements') && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-[#D45060]" />
              {activeTab === 'adjustments' ? 'Stock Adjustment Audit Log' : 'Auditable Stock Movement Ledger'}
            </h3>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="">All Movement Types</option>
              <option value="initial">Opening Stock</option>
              <option value="stock_in">Direct Stock In</option>
              <option value="stock_out">Stock Out</option>
              <option value="adjustment">Stock Adjustment</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="purchase_receipt">Purchase GRN</option>
              <option value="sale">POS Sale Deduction</option>
            </select>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Reason / Reference</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      No stock movements recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => {
                    const isPositive = Number(m.quantity) > 0
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900">
                          {m.product?.name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{m.branch?.name}</TableCell>
                        <TableCell>
                          <Badge variant="neutral" className="uppercase text-[10px]">
                            {m.movement_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right text-xs font-bold font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? `+${m.quantity}` : `${m.quantity}`}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-slate-700">
                          {m.previous_quantity} → <span className="font-bold">{m.new_quantity}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {m.reason || m.remarks || m.reference_type}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{m.user?.name || 'System'}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 5: TRANSFERS */}
      {activeTab === 'transfers' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Inter-Branch Stock Transfers</h3>
            <Button size="sm" onClick={() => setIsTransferModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Transfer
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>Source Branch</TableHead>
                  <TableHead>Destination Branch</TableHead>
                  <TableHead>Items Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No transfer records found. Click New Transfer to dispatch.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">{t.transfer_number}</TableCell>
                      <TableCell className="text-xs">{t.sourceBranch?.name}</TableCell>
                      <TableCell className="text-xs">{t.destinationBranch?.name}</TableCell>
                      <TableCell className="text-xs">{t.items?.length ?? 1} Items</TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'received' ? 'success' : 'warning'}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(t.created_at).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === 'dispatched' && (
                          <Button size="sm" variant="outline" onClick={() => handleReceiveTransfer(t.id)}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Receive
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

      {/* TAB 6: BATCH & EXPIRY */}
      {activeTab === 'batches' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Batch & Expiry Date Management</h3>
            <Button size="sm" onClick={() => setIsBatchModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Batch Record
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Mfg Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No batch records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">{b.batch_number}</TableCell>
                      <TableCell className="text-xs font-semibold">{b.product?.name}</TableCell>
                      <TableCell className="text-xs">{b.branch?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{b.manufacturing_date || '—'}</TableCell>
                      <TableCell className="text-xs font-medium text-amber-600">{b.expiry_date || '—'}</TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">{b.quantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={b.status === 'active' ? 'success' : 'danger'}>{b.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 7: VALUATION REPORT */}
      {activeTab === 'valuation' && valuation && (
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Cost Valuation</div>
              <div className="text-xl font-bold text-slate-800 mt-1">₹{valuation.total_cost_valuation.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Retail Potential</div>
              <div className="text-xl font-bold text-indigo-700 mt-1">₹{valuation.total_retail_valuation.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Estimated Gross Margin</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">₹{valuation.total_projected_profit.toLocaleString()}</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-right">Total Cost Val</TableHead>
                  <TableHead className="text-right">Total Retail Val</TableHead>
                  <TableHead className="text-right">Profit Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuation.items.map((it) => (
                  <TableRow key={it.product_id}>
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{it.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                    </TableCell>
                    <TableCell className="text-xs">{it.category || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{it.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-xs">₹{it.unit_cost}</TableCell>
                    <TableCell className="text-right font-mono text-xs">₹{it.unit_selling_price}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">₹{it.total_cost_valuation}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-indigo-700">₹{it.total_retail_valuation}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600 font-bold">
                      ₹{it.profit_margin_amount} ({it.margin_percentage}%)
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* MODAL 1: STOCK IN */}
      <Modal isOpen={isStockInModalOpen} onClose={() => setIsStockInModalOpen(false)} title="Record Direct Stock In">
        <form onSubmit={handleStockInSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={stockInForm.branch_id}
                onChange={(e) => setStockInForm({ ...stockInForm, branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
              <select
                value={stockInForm.product_id}
                onChange={(e) => setStockInForm({ ...stockInForm, product_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={stockInForm.quantity}
                onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Cost (₹)</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 120"
                value={stockInForm.unit_cost}
                onChange={(e) => setStockInForm({ ...stockInForm, unit_cost: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Notes</label>
            <Input
              value={stockInForm.remarks}
              placeholder="e.g. Received from Supplier direct delivery"
              onChange={(e) => setStockInForm({ ...stockInForm, remarks: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsStockInModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Confirm Stock In</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: STOCK OUT */}
      <Modal isOpen={isStockOutModalOpen} onClose={() => setIsStockOutModalOpen(false)} title="Record Stock Out / Issue">
        <form onSubmit={handleStockOutSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={stockOutForm.branch_id}
                onChange={(e) => setStockOutForm({ ...stockOutForm, branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
              <select
                value={stockOutForm.product_id}
                onChange={(e) => setStockOutForm({ ...stockOutForm, product_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 5"
                value={stockOutForm.quantity}
                onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
              <select
                value={stockOutForm.reason}
                onChange={(e) => setStockOutForm({ ...stockOutForm, reason: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                <option value="Damaged Stock">Damaged Stock</option>
                <option value="Expired Stock">Expired Stock</option>
                <option value="Store Internal Use">Store Internal Use</option>
                <option value="Lost / Theft">Lost / Theft</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsStockOutModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="bg-rose-600 hover:bg-rose-700">Confirm Stock Out</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: STOCK ADJUSTMENT */}
      <Modal isOpen={isAdjustmentModalOpen} onClose={() => setIsAdjustmentModalOpen(false)} title="Stock Adjustment & Audit Write-off">
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={adjustmentForm.branch_id}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={adjustmentForm.type}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as any })}
                className="w-full text-xs border rounded-lg p-2"
              >
                <option value="addition">Addition (+ Increase)</option>
                <option value="subtraction">Subtraction (- Decrease)</option>
                <option value="damage">Damage (Transfer to Damaged)</option>
                <option value="physical_count">Physical Count Reconciliation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
              <Input
                value={adjustmentForm.reason}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
              <select
                value={adjustmentForm.product_id}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, product_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Quantity</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 10 or -5"
                value={adjustmentForm.quantity_adjusted}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity_adjusted: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Notes</label>
            <Input
              value={adjustmentForm.notes}
              placeholder="e.g. Annual audit count correction verified by supervisor"
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAdjustmentModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Record Adjustment</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: INTER-BRANCH TRANSFER */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Inter-Branch Stock Transfer">
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Branch (From)</label>
              <select
                value={transferForm.source_branch_id}
                onChange={(e) => setTransferForm({ ...transferForm, source_branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Branch (To)</label>
              <select
                value={transferForm.destination_branch_id}
                onChange={(e) => setTransferForm({ ...transferForm, destination_branch_id: e.target.value })}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
              <select
                value={transferForm.product_id}
                onChange={(e) => setTransferForm({ ...transferForm, product_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Quantity</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 20"
                value={transferForm.quantity_sent}
                onChange={(e) => setTransferForm({ ...transferForm, quantity_sent: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Notes</label>
            <Input
              value={transferForm.notes}
              placeholder="e.g. Restock North Annex requested by store manager"
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Dispatch Transfer</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: NEW BATCH */}
      <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Create Batch & Expiry Entry">
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={batchForm.branch_id}
                onChange={(e) => setBatchForm({ ...batchForm, branch_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
              <select
                value={batchForm.product_id}
                onChange={(e) => setBatchForm({ ...batchForm, product_id: e.target.value })}
                className="w-full text-xs border rounded-lg p-2"
                required
              >
                <option value="">Select Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number</label>
              <Input
                placeholder="e.g. BATCH-2026-X01"
                value={batchForm.batch_number}
                onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Quantity</label>
              <Input
                type="number"
                placeholder="e.g. 100"
                value={batchForm.quantity}
                onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mfg Date</label>
              <Input
                type="date"
                value={batchForm.manufacturing_date}
                onChange={(e) => setBatchForm({ ...batchForm, manufacturing_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
              <Input
                type="date"
                value={batchForm.expiry_date}
                onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsBatchModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Batch Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryPage
