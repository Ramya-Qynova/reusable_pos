import React, { useState, useEffect, useCallback, useRef, useId } from 'react'
import {
  ShoppingCart,
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  History,
  Store,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  UserCheck,
  Split,
  Percent,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table'
import { Pagination } from '../components/common/Pagination'
import { EmptyState } from '../components/common/EmptyState'
import { useNotification } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import salesService from '../services/salesService'
import cashRegisterService from '../services/cashRegisterService'
import productService from '../services/productService'
import customerService from '../services/customerService'
import type {
  CartItem,
  CashRegisterShift,
  SalesOrder,
  SalesPaginationMeta,
} from '../types/sales'
import type { Category, Product, ProductVariant } from '../types/products'
import type { Customer } from '../types/customers'
import { cn } from '../utils/cn'

function formatMoney(amount: number): string {
  return `₹ ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const SalesPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { user } = useAuth()
  const searchInputId = useId()

  const notify = useCallback(
    (title: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', message?: string) => {
      showNotification({ title, type, message })
    },
    [showNotification]
  )

  // Tab State: 'pos' | 'history' | 'shifts'
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'shifts'>('pos')

  // Permission check: admin or manager has discount permissions
  const canApplyDiscount = user?.is_super_admin || user?.role === 'admin' || user?.role === 'branch_manager'

  // Master Data
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // Filters for POS Product Catalogue
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')

  // POS Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isGstBill, setIsGstBill] = useState(true)
  const [billDiscountType, setBillDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0)
  const [enableRounding, setEnableRounding] = useState(true)
  const [saleNotes, setSaleNotes] = useState('')

  // Variant Selection Modal State
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  // Customer Selection Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'split'>('cash')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [upiReference, setUpiReference] = useState('')
  const [cardReference, setCardReference] = useState('')
  const [splitCash, setSplitCash] = useState<number>(0)
  const [splitUpi, setSplitUpi] = useState<number>(0)
  const [splitCard, setSplitCard] = useState<number>(0)
  const [isSubmittingSale, setIsSubmittingSale] = useState(false)

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<SalesOrder | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Item Discount Modal State
  const [editingDiscountItemIndex, setEditingDiscountItemIndex] = useState<number | null>(null)
  const [itemDiscountType, setItemDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [itemDiscountValue, setItemDiscountValue] = useState<number>(0)

  // Cash Register State
  const [currentShift, setCurrentShift] = useState<CashRegisterShift | null>(null)
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false)
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [openingBalanceInput, setOpeningBalanceInput] = useState<number>(500)
  const [actualClosingBalanceInput, setActualClosingBalanceInput] = useState<number>(0)
  const [shiftNotes, setShiftNotes] = useState('')
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_in')
  const [movementAmount, setMovementAmount] = useState<number>(0)
  const [movementReason, setMovementReason] = useState('')
  const [shiftsHistory, setShiftsHistory] = useState<CashRegisterShift[]>([])
  const [shiftsMeta, setShiftsMeta] = useState<SalesPaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  })

  // Sales History State
  const [salesList, setSalesList] = useState<SalesOrder[]>([])
  const [salesMeta, setSalesMeta] = useState<SalesPaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  })
  const [salesFilterSearch, setSalesFilterSearch] = useState('')
  const [salesFilterStatus, setSalesFilterStatus] = useState<string>('all')
  const [salesFilterFromDate, setSalesFilterFromDate] = useState('')
  const [salesFilterToDate, setSalesFilterToDate] = useState('')
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<SalesOrder | null>(null)
  const [isInvoiceDetailsModalOpen, setIsInvoiceDetailsModalOpen] = useState(false)
  const [cancelSaleTarget, setCancelSaleTarget] = useState<SalesOrder | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)
  const [salesSummary, setSalesSummary] = useState<{
    total_sales_count: number
    total_revenue: number
    payment_breakdown: { cash: number; upi: number; card: number; other: number }
  } | null>(null)

  const handleCancelSale = async () => {
    if (!cancelSaleTarget) return
    try {
      setIsSubmittingCancel(true)
      const updated = await salesService.cancelSale(cancelSaleTarget.id, cancellationReason)
      notify('Sale Cancelled', 'success', `Sale ${updated.invoice_number} cancelled and inventory restored.`)
      setIsCancelModalOpen(false)
      setIsInvoiceDetailsModalOpen(false)
      setCancellationReason('')
      setCancelSaleTarget(null)
      loadSalesHistory()
      loadCurrentShift()
    } catch (err: unknown) {
      console.error('Cancellation failed:', err)
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data
      notify('Cancellation Failed', 'error', data?.message || 'Failed to cancel sale order')
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  // Barcode Scanner Listener buffer
  const barcodeBufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  // ==========================================
  // Initial Data Loading
  // ==========================================

  const loadMasterData = useCallback(async () => {
    try {
      setIsLoadingProducts(true)
      const [cats, prods, custs] = await Promise.all([
        productService.getCategories(),
        productService.getProducts({ per_page: 100 }),
        customerService.getCustomers({ per_page: 100 }),
      ])
      setCategories(cats)
      setProducts(prods.products || [])
      setCustomers(custs.items)
    } catch (err) {
      console.error('Failed to load POS master data:', err)
      notify('Product Catalogue', 'error', 'Failed to load product catalogue')
    } finally {
      setIsLoadingProducts(false)
    }
  }, [notify])

  const loadCurrentShift = useCallback(async () => {
    try {
      const shift = await cashRegisterService.getCurrentShift()
      setCurrentShift(shift)
    } catch (err) {
      console.warn('Could not retrieve active shift:', err)
    }
  }, [])

  const loadShiftsHistory = useCallback(async (page = 1) => {
    try {
      const resp = await cashRegisterService.getShifts({ page })
      setShiftsHistory(resp.items)
      if (resp.meta) setShiftsMeta(resp.meta)
    } catch (err) {
      console.error('Failed to load shifts history:', err)
    }
  }, [])

  const loadSalesHistory = useCallback(
    async (page = 1) => {
      try {
        const params: Record<string, string | number> = { page }
        if (salesFilterSearch) params.search = salesFilterSearch
        if (salesFilterStatus !== 'all') params.payment_status = salesFilterStatus
        if (salesFilterFromDate) params.from_date = salesFilterFromDate
        if (salesFilterToDate) params.to_date = salesFilterToDate

        const [listResp, summaryResp] = await Promise.all([
          salesService.getSales(params),
          salesService.getSummary({
            from_date: salesFilterFromDate || undefined,
            to_date: salesFilterToDate || undefined,
          }),
        ])
        setSalesList(listResp.items)
        if (listResp.meta) setSalesMeta(listResp.meta)
        setSalesSummary(summaryResp)
      } catch (err) {
        console.error('Failed to load sales history:', err)
      }
    },
    [salesFilterSearch, salesFilterStatus, salesFilterFromDate, salesFilterToDate]
  )

  useEffect(() => {
    loadMasterData()
    loadCurrentShift()
  }, [loadMasterData, loadCurrentShift])

  useEffect(() => {
    if (activeTab === 'shifts') {
      loadShiftsHistory()
    } else if (activeTab === 'history') {
      loadSalesHistory()
    }
  }, [activeTab, loadShiftsHistory, loadSalesHistory])

  // ==========================================
  // Cart Actions & Billing Calculations
  // ==========================================

  const recalculateCartItem = useCallback(
    (item: CartItem): CartItem => {
      const grossLine = Number((item.unit_price * item.quantity).toFixed(2))
      let discountAmount = 0

      if (item.discount_type === 'percentage' && (item.discount_rate || 0) > 0) {
        discountAmount = Number(((grossLine * (item.discount_rate || 0)) / 100).toFixed(2))
      } else if (item.discount_type === 'fixed' && (item.discount_amount || 0) > 0) {
        discountAmount = Number(Math.min(item.discount_amount, grossLine).toFixed(2))
      }

      const lineAfterDiscount = Number((grossLine - discountAmount).toFixed(2))
      let subtotal = 0
      let taxAmount = 0

      if (isGstBill && item.tax_rate > 0) {
        if (item.is_tax_inclusive) {
          const taxableBase = Number((lineAfterDiscount / (1 + item.tax_rate / 100)).toFixed(2))
          taxAmount = Number((lineAfterDiscount - taxableBase).toFixed(2))
          subtotal = taxableBase
        } else {
          subtotal = lineAfterDiscount
          taxAmount = Number(((subtotal * item.tax_rate) / 100).toFixed(2))
        }
      } else {
        subtotal = lineAfterDiscount
        taxAmount = 0
      }

      const cgst = Number((taxAmount / 2).toFixed(2))
      const sgst = Number((taxAmount - cgst).toFixed(2))
      const total = item.is_tax_inclusive ? lineAfterDiscount : Number((subtotal + taxAmount).toFixed(2))

      return {
        ...item,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        cgst_amount: cgst,
        sgst_amount: sgst,
        subtotal,
        total,
      }
    },
    [isGstBill]
  )

  const addToCart = useCallback(
    (product: Product, variant?: ProductVariant | null) => {
      const variantId = variant?.id || null

      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex(
          (item) => item.product_id === product.id && item.product_variant_id === variantId
        )

        const allowDecimals = product.unit?.allow_decimals ?? false
        const unitPrice = variant ? Number(variant.selling_price) : Number(product.selling_price)
        const taxRate = isGstBill ? Number(product.tax_rate || 0) : 0
        const isTaxInclusive = Boolean(product.is_tax_inclusive)

        if (existingIndex > -1) {
          const updated = [...prevCart]
          const currentItem = updated[existingIndex]
          const newQty = currentItem.quantity + 1
          updated[existingIndex] = recalculateCartItem({
            ...currentItem,
            quantity: newQty,
          })
          return updated
        } else {
          let variantName: string | undefined = undefined
          if (variant && variant.attributes_json) {
            variantName = Object.entries(variant.attributes_json)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          }

          const newItem: CartItem = recalculateCartItem({
            product_id: product.id,
            product_variant_id: variantId,
            product_name: product.name,
            variant_name: variantName,
            sku: variant?.variant_sku || product.sku,
            barcode: variant?.variant_barcode || product.barcode,
            unit_name: product.unit?.name || 'Unit',
            allow_decimals: allowDecimals,
            quantity: 1,
            unit_price: unitPrice,
            discount_type: null,
            discount_rate: 0,
            discount_amount: 0,
            tax_rate: taxRate,
            is_tax_inclusive: isTaxInclusive,
            tax_amount: 0,
            cgst_amount: 0,
            sgst_amount: 0,
            subtotal: 0,
            total: 0,
          })
          return [...prevCart, newItem]
        }
      })
    },
    [isGstBill, recalculateCartItem]
  )

  // ==========================================
  // Barcode Scanner Integration (Keyboard listener)
  // ==========================================

  const handleBarcodeScanned = useCallback(
    async (barcode: string) => {
      const trimmed = barcode.trim()
      if (!trimmed) return

      const matchedProd = products.find(
        (p) =>
          p.barcode === trimmed ||
          p.sku === trimmed ||
          p.variants?.some((v) => v.variant_barcode === trimmed || v.variant_sku === trimmed)
      )

      if (matchedProd) {
        if (matchedProd.has_variants) {
          const matchedVariant = matchedProd.variants?.find(
            (v) => v.variant_barcode === trimmed || v.variant_sku === trimmed
          )
          if (matchedVariant) {
            addToCart(matchedProd, matchedVariant)
            notify('Item Added', 'success', `Added [${matchedProd.name} - ${matchedVariant.variant_sku}] via scanner`)
            return
          } else {
            setVariantModalProduct(matchedProd)
            return
          }
        }
        addToCart(matchedProd)
        notify('Item Added', 'success', `Added [${matchedProd.name}] via scanner`)
      } else {
        try {
          const lookupResult = await productService.lookupBarcode(trimmed)
          if (lookupResult && lookupResult.product) {
            addToCart(lookupResult.product)
            notify('Item Added', 'success', `Added [${lookupResult.product.name}] via scanner lookup`)
          } else {
            notify('Barcode Lookup', 'warning', `No product found for barcode: ${trimmed}`)
          }
        } catch {
          notify('Barcode Scanner', 'warning', `Barcode [${trimmed}] not recognized in catalog`)
        }
      }
    },
    [products, addToCart, notify]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      const currentTime = Date.now()
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = ''
      }
      lastKeyTimeRef.current = currentTime

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          handleBarcodeScanned(barcodeBufferRef.current)
          barcodeBufferRef.current = ''
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBarcodeScanned])

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index)
      return
    }

    const item = cart[index]
    if (!item.allow_decimals && Math.floor(newQty) !== newQty) {
      notify('Unit Constraint', 'warning', `Decimals not allowed for unit [${item.unit_name}]`)
      return
    }

    const updated = [...cart]
    updated[index] = recalculateCartItem({
      ...item,
      quantity: Number(newQty),
    })
    setCart(updated)
  }

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setBillDiscountValue(0)
    setSaleNotes('')
  }

  // Recalculate whole cart if isGstBill changes
  useEffect(() => {
    setCart((prev) => prev.map((item) => recalculateCartItem(item)))
  }, [isGstBill, recalculateCartItem])

  // Cart Totals
  const itemsSubtotalSum = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const itemsCgstSum = cart.reduce((sum, item) => sum + item.cgst_amount, 0)
  const itemsSgstSum = cart.reduce((sum, item) => sum + item.sgst_amount, 0)
  const itemsNetTotal = cart.reduce((sum, item) => sum + item.total, 0)

  // Bill-level discount calculation
  let calculatedBillDiscount = 0
  if (billDiscountValue > 0) {
    if (billDiscountType === 'percentage') {
      calculatedBillDiscount = Number(((itemsNetTotal * billDiscountValue) / 100).toFixed(2))
    } else {
      calculatedBillDiscount = Number(Math.min(billDiscountValue, itemsNetTotal).toFixed(2))
    }
  }

  const preRoundTotal = Number((itemsNetTotal - calculatedBillDiscount).toFixed(2))
  const grandTotal = enableRounding ? Math.round(preRoundTotal) : preRoundTotal
  const roundOffAmount = enableRounding ? Number((grandTotal - preRoundTotal).toFixed(2)) : 0

  // Quick cash buttons helper
  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 50) * 50 || 50,
    Math.ceil(grandTotal / 100) * 100 || 100,
    500,
    1000,
    2000,
  ].filter((v, idx, arr) => v >= grandTotal && arr.indexOf(v) === idx)

  // ==========================================
  // Sale Submission / Checkout
  // ==========================================

  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      notify('Cart Empty', 'warning', 'Cart is empty. Add products to proceed.')
      return
    }
    setPaymentMode('cash')
    setCashReceived(grandTotal)
    setSplitCash(grandTotal)
    setSplitUpi(0)
    setSplitCard(0)
    setUpiReference('')
    setCardReference('')
    setIsPaymentModalOpen(true)
  }

  const handleCompleteSale = async () => {
    try {
      setIsSubmittingSale(true)

      let paymentsPayload: { payment_method: string; amount: number; payment_reference?: string }[] = []

      if (paymentMode === 'cash') {
        if (cashReceived < grandTotal) {
          notify('Payment Validation', 'warning', 'Cash received is less than grand total')
          setIsSubmittingSale(false)
          return
        }
        paymentsPayload = [{ payment_method: 'cash', amount: cashReceived }]
      } else if (paymentMode === 'upi') {
        paymentsPayload = [{ payment_method: 'upi', amount: grandTotal, payment_reference: upiReference }]
      } else if (paymentMode === 'card') {
        paymentsPayload = [{ payment_method: 'card', amount: grandTotal, payment_reference: cardReference }]
      } else if (paymentMode === 'split') {
        const totalSplit = Number((splitCash + splitUpi + splitCard).toFixed(2))
        if (totalSplit < grandTotal) {
          notify('Split Payment', 'warning', `Total split payment (₹${totalSplit}) is less than total due (₹${grandTotal})`)
          setIsSubmittingSale(false)
          return
        }
        if (splitCash > 0) paymentsPayload.push({ payment_method: 'cash', amount: splitCash })
        if (splitUpi > 0) paymentsPayload.push({ payment_method: 'upi', amount: splitUpi, payment_reference: upiReference })
        if (splitCard > 0) paymentsPayload.push({ payment_method: 'card', amount: splitCard, payment_reference: cardReference })
      }

      const payload = {
        customer_id: selectedCustomer?.id || null,
        is_gst_bill: isGstBill,
        enable_rounding: enableRounding,
        discount_type: billDiscountValue > 0 ? billDiscountType : null,
        discount_rate: billDiscountType === 'percentage' ? billDiscountValue : 0,
        discount_amount: billDiscountType === 'fixed' ? billDiscountValue : 0,
        notes: saleNotes || null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          product_variant_id: item.product_variant_id || null,
          quantity: item.quantity,
          discount_type: item.discount_type || null,
          discount_rate: item.discount_rate || 0,
          discount_amount: item.discount_amount || 0,
        })),
        payments: paymentsPayload,
      }

      const createdOrder = await salesService.createSale(payload)
      notify('Sale Finalized', 'success', `Sale recorded successfully! Invoice: ${createdOrder.invoice_number}`)

      setCompletedSale(createdOrder)
      setIsPaymentModalOpen(false)
      setIsReceiptModalOpen(true)

      clearCart()
      loadCurrentShift()
    } catch (err: unknown) {
      console.error('Sale checkout failed:', err)
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      let errorMsg = data?.message || 'Failed to complete sale transaction'
      if (data?.errors) {
        errorMsg = Object.values(data.errors).flat().join(' ')
      }
      notify('Checkout Failed', 'error', errorMsg)
    } finally {
      setIsSubmittingSale(false)
    }
  }

  // ==========================================
  // Cash Drawer Register Actions
  // ==========================================

  const handleOpenShift = async () => {
    try {
      const shift = await cashRegisterService.openShift(openingBalanceInput, shiftNotes)
      setCurrentShift(shift)
      setIsOpenShiftModalOpen(false)
      setShiftNotes('')
      notify('Register Shift', 'success', 'Cash register shift opened successfully.')
      loadShiftsHistory()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to open shift'
      notify('Shift Error', 'error', msg)
    }
  }

  const handleCloseShift = async () => {
    try {
      const closed = await cashRegisterService.closeShift(actualClosingBalanceInput, shiftNotes)
      setCurrentShift(null)
      setIsCloseShiftModalOpen(false)
      setShiftNotes('')
      notify('Shift Closed', 'success', `Shift closed. Difference: ${formatMoney(Number(closed.difference))}`)
      loadShiftsHistory()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to close shift'
      notify('Shift Error', 'error', msg)
    }
  }

  const handleRecordMovement = async () => {
    if (movementAmount <= 0) {
      notify('Input Error', 'warning', 'Please enter a valid amount')
      return
    }
    if (!movementReason.trim()) {
      notify('Input Error', 'warning', 'Please enter reason for movement')
      return
    }

    try {
      await cashRegisterService.recordMovement(movementType, movementAmount, movementReason)
      setIsMovementModalOpen(false)
      setMovementAmount(0)
      setMovementReason('')
      notify('Cash Movement', 'success', 'Cash movement recorded successfully')
      loadCurrentShift()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to record movement'
      notify('Movement Error', 'error', msg)
    }
  }

  const filteredProducts = products.filter((p) => {
    if (!p.is_active) return false
    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim()
      const matchName = p.name.toLowerCase().includes(q)
      const matchSku = p.sku.toLowerCase().includes(q)
      const matchBarcode = p.barcode?.toLowerCase().includes(q)
      return matchName || matchSku || matchBarcode
    }
    return true
  })

  const filteredCustomers = customers.filter((c) => {
    if (!c.is_active) return false
    if (customerSearchQuery.trim()) {
      const q = customerSearchQuery.toLowerCase().trim()
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.customer_code.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="POS Billing & Sales"
          subtitle="Real-time barcode counter checkout, sales orders, tax invoicing and cashier shifts."
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        <div className="flex items-center gap-3">
          {currentShift && currentShift.status === 'open' ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-semibold">Register Open</span>
              <span className="text-emerald-600">|</span>
              <span>Cash: {formatMoney(Number(currentShift.expected_balance ?? currentShift.opening_balance))}</span>
              <button
                onClick={() => {
                  setActualClosingBalanceInput(Number(currentShift.expected_balance ?? currentShift.opening_balance))
                  setIsCloseShiftModalOpen(true)
                }}
                className="ml-1 font-medium text-emerald-700 underline hover:text-emerald-900"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="font-semibold">Register Closed</span>
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="ml-1 rounded-md bg-amber-600 px-2 py-0.5 font-medium text-white hover:bg-amber-700"
              >
                Open Shift
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pos')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors',
            activeTab === 'pos'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          POS Counter Billing
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors',
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          )}
        >
          <Receipt className="h-4 w-4" />
          Sales & Invoices History
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors',
            activeTab === 'shifts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          )}
        >
          <History className="h-4 w-4" />
          Cash Register Shifts
        </button>
      </div>

      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id={searchInputId}
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by product name, SKU or scan barcode..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && productSearch.trim()) {
                        handleBarcodeScanned(productSearch)
                      }
                    }}
                  />
                  <Barcode className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-500" />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                    <UserCheck className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium text-gray-700 truncate max-w-[130px]">
                      {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomerModalOpen(true)}
                  >
                    {selectedCustomer ? 'Change' : 'Select'}
                  </Button>
                  {selectedCustomer && (
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      title="Switch to Walk-in"
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors',
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </Card>

            {isLoadingProducts ? (
              <div className="flex h-64 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Barcode className="h-10 w-10 text-gray-400" />}
                title="No Products Found"
                description="Try another search keyword, check category filter or scan a barcode."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (prod.has_variants) {
                        setVariantModalProduct(prod)
                      } else {
                        addToCart(prod)
                      }
                    }}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
                          {prod.sku}
                        </span>
                        {prod.has_variants && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                            {prod.variants?.length || 'Multi'} Var
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-base font-bold text-gray-900">
                          {formatMoney(Number(prod.selling_price))}
                        </span>
                        <div className="text-[11px] text-gray-500">
                          per {prod.unit?.short_code || 'unit'}
                        </div>
                      </div>
                      <button
                        className="rounded-lg bg-indigo-50 p-2 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white"
                        title="Add to Cart"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-5 xl:col-span-4">
            <Card className="flex flex-col h-full border-gray-200 p-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-900">Active Cart</h3>
                  <Badge variant="primary" size="sm">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                  </Badge>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              <div className="my-2 flex-1 space-y-2 overflow-y-auto max-h-[380px] pr-1">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                    <ShoppingCart className="h-10 w-10 stroke-[1.5] text-gray-300" />
                    <p className="mt-2 text-sm font-medium">Cart is currently empty</p>
                    <p className="text-xs">Click products on the left or scan barcode</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={`${item.product_id}-${item.product_variant_id || 'base'}`}
                      className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-sm transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-semibold text-gray-900 line-clamp-1">
                            {item.product_name}
                          </h5>
                          {item.variant_name && (
                            <span className="text-xs text-indigo-600 font-medium">
                              {item.variant_name}
                            </span>
                          )}
                          <div className="text-xs text-gray-500">
                            {formatMoney(item.unit_price)} × {item.quantity} {item.unit_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900">
                            {formatMoney(item.total)}
                          </span>
                          {item.discount_amount > 0 && (
                            <div className="text-[11px] text-emerald-600">
                              -{formatMoney(item.discount_amount)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-gray-200/60 pt-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            className="rounded-md bg-white border border-gray-200 p-1 text-gray-600 hover:bg-gray-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            step={item.allow_decimals ? '0.25' : '1'}
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(idx, parseFloat(e.target.value) || 0)}
                            className="w-14 rounded-md border border-gray-200 bg-white py-0.5 text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            className="rounded-md bg-white border border-gray-200 p-1 text-gray-600 hover:bg-gray-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (!canApplyDiscount) {
                                notify('Permission Denied', 'warning', 'Permission pos.discount required to apply discounts')
                                return
                              }
                              setEditingDiscountItemIndex(idx)
                              setItemDiscountType(item.discount_type || 'percentage')
                              setItemDiscountValue(item.discount_rate || item.discount_amount || 0)
                            }}
                            className={cn(
                              'flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                              item.discount_amount > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'text-gray-500 hover:bg-gray-200'
                            )}
                            title={canApplyDiscount ? 'Item Discount' : 'Discount restricted'}
                          >
                            <Percent className="h-3 w-3" />
                            {item.discount_amount > 0 ? 'Discounted' : 'Disc'}
                          </button>

                          <button
                            onClick={() => removeFromCart(idx)}
                            className="rounded-md p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Remove Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-auto space-y-2.5 border-t border-gray-200 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-600">GST Invoice Billing</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isGstBill}
                      onChange={(e) => setIsGstBill(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full"></div>
                  </label>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (Base)</span>
                  <span className="font-semibold text-gray-800">{formatMoney(itemsSubtotalSum)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">Bill Discount</span>
                    {!canApplyDiscount && (
                      <span className="text-[10px] text-amber-600 font-medium">(Locked)</span>
                    )}
                  </div>
                  {canApplyDiscount ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={billDiscountType}
                        onChange={(e) => setBillDiscountType(e.target.value as 'percentage' | 'fixed')}
                        className="rounded border border-gray-200 bg-white py-0.5 text-[11px]"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">₹</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={billDiscountValue || ''}
                        onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-14 rounded border border-gray-200 bg-white py-0.5 text-center text-[11px]"
                      />
                    </div>
                  ) : (
                    <span className="text-gray-400">₹ 0.00</span>
                  )}
                </div>

                {calculatedBillDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount Applied</span>
                    <span>-{formatMoney(calculatedBillDiscount)}</span>
                  </div>
                )}

                {isGstBill && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST (Central Tax)</span>
                      <span>{formatMoney(itemsCgstSum)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST (State Tax)</span>
                      <span>{formatMoney(itemsSgstSum)}</span>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span>Round Off</span>
                    <input
                      type="checkbox"
                      checked={enableRounding}
                      onChange={(e) => setEnableRounding(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                  </div>
                  <span>{formatMoney(roundOffAmount)}</span>
                </div>

                <div className="flex items-baseline justify-between border-t border-gray-200 pt-2 text-gray-900">
                  <span className="text-sm font-bold">Grand Total</span>
                  <span className="text-xl font-extrabold text-indigo-600">
                    {formatMoney(grandTotal)}
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleOpenPaymentModal}
                  disabled={cart.length === 0}
                >
                  <DollarSign className="mr-1.5 h-5 w-5" />
                  Pay & Finalize {formatMoney(grandTotal)}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {salesSummary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="p-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales</span>
                <div className="mt-1 text-2xl font-bold text-gray-900">{salesSummary.total_sales_count}</div>
                <span className="text-xs text-gray-400">Completed invoices</span>
              </Card>
              <Card className="p-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</span>
                <div className="mt-1 text-2xl font-bold text-emerald-600">{formatMoney(salesSummary.total_revenue)}</div>
                <span className="text-xs text-gray-400">All payment channels</span>
              </Card>
              <Card className="p-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash Collected</span>
                <div className="mt-1 text-2xl font-bold text-indigo-600">{formatMoney(salesSummary.payment_breakdown.cash)}</div>
                <span className="text-xs text-gray-400">Direct register cash</span>
              </Card>
              <Card className="p-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Digital Payments</span>
                <div className="mt-1 text-2xl font-bold text-purple-600">
                  {formatMoney(salesSummary.payment_breakdown.upi + salesSummary.payment_breakdown.card)}
                </div>
                <span className="text-xs text-gray-400">UPI & Card combined</span>
              </Card>
            </div>
          )}

          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Input
                label="Search Invoices"
                placeholder="Invoice # or customer name..."
                value={salesFilterSearch}
                onChange={(e) => setSalesFilterSearch(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Payment Status</label>
                <select
                  value={salesFilterStatus}
                  onChange={(e) => setSalesFilterStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <Input
                type="date"
                label="From Date"
                value={salesFilterFromDate}
                onChange={(e) => setSalesFilterFromDate(e.target.value)}
              />
              <Input
                type="date"
                label="To Date"
                value={salesFilterToDate}
                onChange={(e) => setSalesFilterToDate(e.target.value)}
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSalesFilterSearch('')
                  setSalesFilterStatus('all')
                  setSalesFilterFromDate('')
                  setSalesFilterToDate('')
                  loadSalesHistory(1)
                }}
              >
                Reset Filters
              </Button>
              <Button variant="primary" size="sm" onClick={() => loadSalesHistory(1)}>
                Apply Filters
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                      No sales transactions found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesList.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-gray-50">
                      <TableCell className="font-bold text-indigo-600">
                        {sale.invoice_number}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(sale.order_date).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">
                          {sale.customer ? sale.customer.name : 'Walk-in Customer'}
                        </span>
                        {sale.customer?.phone && (
                          <div className="text-[11px] text-gray-400">{sale.customer.phone}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        {sale.user?.name || 'Cashier'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {sale.payments?.map((p) => (
                            <Badge key={p.id} variant="neutral" size="sm" className="capitalize">
                              {p.payment_method}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sale.payment_status === 'paid'
                              ? 'success'
                              : sale.payment_status === 'partial'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {sale.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-900">
                        {formatMoney(sale.grand_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoiceDetails(sale)
                              setIsInvoiceDetailsModalOpen(true)
                            }}
                            title="View Details"
                          >
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCompletedSale(sale)
                              setIsReceiptModalOpen(true)
                            }}
                            title="Print Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {salesMeta.total > salesMeta.per_page && (
              <div className="border-t border-gray-200 p-4">
                <Pagination
                  currentPage={salesMeta.current_page}
                  totalPages={salesMeta.last_page}
                  onPageChange={(page) => loadSalesHistory(page)}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {currentShift && currentShift.status === 'open' ? (
            <Card className="border-l-4 border-l-emerald-500 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">Active Register Shift</h3>
                    <Badge variant="success">Open</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Opened at{' '}
                    {new Date(currentShift.opened_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short',
                    })}{' '}
                    by {currentShift.user?.name || user?.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMovementType('cash_in')
                      setIsMovementModalOpen(true)
                    }}
                  >
                    <ArrowDownLeft className="mr-1 h-4 w-4 text-emerald-600" />
                    Cash In (Pay-in)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMovementType('cash_out')
                      setIsMovementModalOpen(true)
                    }}
                  >
                    <ArrowUpRight className="mr-1 h-4 w-4 text-rose-600" />
                    Cash Out (Expense)
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700"
                    onClick={() => {
                      setActualClosingBalanceInput(Number(currentShift.expected_balance ?? currentShift.opening_balance))
                      setIsCloseShiftModalOpen(true)
                    }}
                  >
                    Close Shift
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-5">
                <div>
                  <span className="text-xs text-gray-500">Opening Balance</span>
                  <div className="text-lg font-bold text-gray-800">
                    {formatMoney(currentShift.opening_balance)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Cash Sales</span>
                  <div className="text-lg font-bold text-emerald-600">
                    +{formatMoney(currentShift.cash_sales_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Cash In (Pay-ins)</span>
                  <div className="text-lg font-bold text-indigo-600">
                    +{formatMoney(currentShift.cash_in_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Cash Out (Expenses)</span>
                  <div className="text-lg font-bold text-rose-600">
                    -{formatMoney(currentShift.cash_out_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-700">Expected in Drawer</span>
                  <div className="text-xl font-extrabold text-indigo-600">
                    {formatMoney(Number(currentShift.expected_balance ?? currentShift.expected_closing_balance ?? currentShift.opening_balance))}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <Store className="h-12 w-12 text-gray-400" />
              <h3 className="mt-3 text-lg font-bold text-gray-900">No Register Shift Open</h3>
              <p className="mt-1 max-w-md text-sm text-gray-500">
                You currently do not have an active register shift in this branch. Open a shift to record cash sales and drawer movements.
              </p>
              <Button
                variant="primary"
                size="md"
                className="mt-4"
                onClick={() => setIsOpenShiftModalOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Open Cash Drawer Shift
              </Button>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="border-b border-gray-100 p-4 font-bold text-gray-900">
              Shift History Log
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift #</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead>Closed At</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Opening Cash</TableHead>
                  <TableHead className="text-right">Expected Close</TableHead>
                  <TableHead className="text-right">Actual Close</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftsHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                      No shift records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  shiftsHistory.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-gray-800">#{s.id}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(s.opened_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {s.closed_at
                          ? new Date(s.closed_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-700">
                        {s.user?.name || 'Staff'}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(s.opening_balance)}</TableCell>
                      <TableCell className="text-right">
                        {s.expected_closing_balance ? formatMoney(s.expected_closing_balance) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.actual_closing_balance ? formatMoney(s.actual_closing_balance) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.difference !== null && s.difference !== undefined ? (
                          <span
                            className={cn(
                              'font-bold',
                              Number(s.difference) === 0
                                ? 'text-emerald-600'
                                : Number(s.difference) < 0
                                ? 'text-rose-600'
                                : 'text-indigo-600'
                            )}
                          >
                            {formatMoney(Number(s.difference))}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'open' ? 'success' : 'neutral'} size="sm">
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {shiftsMeta.total > shiftsMeta.per_page && (
              <div className="border-t border-gray-200 p-4">
                <Pagination
                  currentPage={shiftsMeta.current_page}
                  totalPages={shiftsMeta.last_page}
                  onPageChange={(page) => loadShiftsHistory(page)}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Variant Selector Modal */}
      <Modal
        isOpen={Boolean(variantModalProduct)}
        onClose={() => {
          setVariantModalProduct(null)
          setSelectedVariant(null)
        }}
        title={`Select Variant: ${variantModalProduct?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Please select the specific size, color or attribute variant to add to bill:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {variantModalProduct?.variants?.map((v) => {
              const attrs = v.attributes_json
                ? Object.entries(v.attributes_json)
                    .map(([k, val]) => `${k}: ${val}`)
                    .join(' | ')
                : v.variant_sku
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors',
                    selectedVariant?.id === v.id
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <div>
                    <span className="font-semibold text-gray-900 text-sm">{attrs}</span>
                    <div className="text-xs text-gray-400">SKU: {v.variant_sku}</div>
                  </div>
                  <span className="text-base font-bold text-indigo-600">
                    {formatMoney(Number(v.selling_price))}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setVariantModalProduct(null)
                setSelectedVariant(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedVariant}
              onClick={() => {
                if (variantModalProduct && selectedVariant) {
                  addToCart(variantModalProduct, selectedVariant)
                  setVariantModalProduct(null)
                  setSelectedVariant(null)
                }
              }}
            >
              Add Selected Variant
            </Button>
          </div>
        </div>
      </Modal>

      {/* Customer Selector Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Select Customer for Invoice"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search by customer name, phone or code..."
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
          />

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            <div
              onClick={() => {
                setSelectedCustomer(null)
                setIsCustomerModalOpen(false)
              }}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-300 p-3 hover:bg-gray-50"
            >
              <div>
                <span className="font-semibold text-gray-900">Walk-in Customer</span>
                <p className="text-xs text-gray-500">Standard counter customer with no account</p>
              </div>
              <Badge variant="neutral">Default</Badge>
            </div>

            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                onClick={() => {
                  setSelectedCustomer(cust)
                  setIsCustomerModalOpen(false)
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-xl border p-3 hover:border-indigo-500 hover:bg-indigo-50/30 transition-colors',
                  selectedCustomer?.id === cust.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                )}
              >
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{cust.name}</div>
                  <div className="text-xs text-gray-500">
                    {cust.phone} | {cust.customer_code}
                  </div>
                </div>
                {cust.city && <span className="text-xs text-gray-400">{cust.city}</span>}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Item Discount Modal */}
      <Modal
        isOpen={editingDiscountItemIndex !== null}
        onClose={() => setEditingDiscountItemIndex(null)}
        title="Item-Level Discount"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Apply a special promotional discount to this item (requires pos.discount permission).
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setItemDiscountType('percentage')}
              className={cn(
                'flex-1 rounded-xl border py-2 text-xs font-semibold',
                itemDiscountType === 'percentage'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600'
              )}
            >
              Percentage (%)
            </button>
            <button
              onClick={() => setItemDiscountType('fixed')}
              className={cn(
                'flex-1 rounded-xl border py-2 text-xs font-semibold',
                itemDiscountType === 'fixed'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600'
              )}
            >
              Fixed Amount (₹)
            </button>
          </div>

          <Input
            type="number"
            min="0"
            label={itemDiscountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
            value={itemDiscountValue || ''}
            onChange={(e) => setItemDiscountValue(parseFloat(e.target.value) || 0)}
          />

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => {
                if (editingDiscountItemIndex !== null) {
                  setCart((prev) => {
                    const updated = [...prev]
                    updated[editingDiscountItemIndex] = recalculateCartItem({
                      ...updated[editingDiscountItemIndex],
                      discount_type: null,
                      discount_rate: 0,
                      discount_amount: 0,
                    })
                    return updated
                  })
                }
                setEditingDiscountItemIndex(null)
              }}
            >
              Remove Discount
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (editingDiscountItemIndex !== null) {
                  setCart((prev) => {
                    const updated = [...prev]
                    updated[editingDiscountItemIndex] = recalculateCartItem({
                      ...updated[editingDiscountItemIndex],
                      discount_type: itemDiscountType,
                      discount_rate: itemDiscountType === 'percentage' ? itemDiscountValue : 0,
                      discount_amount: itemDiscountType === 'fixed' ? itemDiscountValue : 0,
                    })
                    return updated
                  })
                }
                setEditingDiscountItemIndex(null)
              }}
            >
              Apply Discount
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Checkout Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Checkout & Payment"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 p-4 text-center text-white">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-100">
              Total Amount Due
            </span>
            <div className="text-3xl font-extrabold">{formatMoney(grandTotal)}</div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setPaymentMode('cash')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                paymentMode === 'cash'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <Banknote className="h-5 w-5" />
              Cash
            </button>
            <button
              onClick={() => setPaymentMode('upi')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                paymentMode === 'upi'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <Smartphone className="h-5 w-5" />
              UPI
            </button>
            <button
              onClick={() => setPaymentMode('card')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                paymentMode === 'card'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <CreditCard className="h-5 w-5" />
              Card
            </button>
            <button
              onClick={() => setPaymentMode('split')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                paymentMode === 'split'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <Split className="h-5 w-5" />
              Split
            </button>
          </div>

          {paymentMode === 'cash' && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
              <div className="flex flex-wrap gap-2">
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setCashReceived(opt)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                      cashReceived === opt
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    ₹ {opt}
                  </button>
                ))}
              </div>

              <Input
                type="number"
                min="0"
                label="Cash Tendered / Received (₹)"
                value={cashReceived || ''}
                onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
              />

              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
                <span className="font-medium">Change to Return Customer:</span>
                <span className="text-base font-extrabold">
                  {formatMoney(Math.max(0, cashReceived - grandTotal))}
                </span>
              </div>
            </div>
          )}

          {paymentMode === 'upi' && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
              <p className="text-xs text-gray-500">
                Scan store QR code on counter or enter customer UPI transaction reference:
              </p>
              <Input
                label="UPI Reference / Transaction ID"
                placeholder="e.g. 331204882190"
                value={upiReference}
                onChange={(e) => setUpiReference(e.target.value)}
              />
            </div>
          )}

          {paymentMode === 'card' && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
              <p className="text-xs text-gray-500">
                Swipe card on POS terminal and enter authorization code or last 4 digits:
              </p>
              <Input
                label="Card Reference / Last 4 Digits"
                placeholder="e.g. 4021"
                value={cardReference}
                onChange={(e) => setCardReference(e.target.value)}
              />
            </div>
          )}

          {paymentMode === 'split' && (
            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
              <Input
                type="number"
                label="Cash Amount (₹)"
                value={splitCash || ''}
                onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
              />
              <Input
                type="number"
                label="UPI Amount (₹)"
                value={splitUpi || ''}
                onChange={(e) => setSplitUpi(parseFloat(e.target.value) || 0)}
              />
              <Input
                type="number"
                label="Card Amount (₹)"
                value={splitCard || ''}
                onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
              />
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-gray-500">Total Tendered:</span>
                <span
                  className={cn(
                    'font-bold',
                    splitCash + splitUpi + splitCard >= grandTotal
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  )}
                >
                  {formatMoney(splitCash + splitUpi + splitCard)} / {formatMoney(grandTotal)}
                </span>
              </div>
            </div>
          )}

          <Input
            label="Order Notes (Optional)"
            placeholder="Add any internal order note..."
            value={saleNotes}
            onChange={(e) => setSaleNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isSubmittingSale}
            >
              Back to Cart
            </Button>
            <Button
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCompleteSale}
              disabled={isSubmittingSale}
            >
              {isSubmittingSale ? (
                <>
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  Finalizing Sale...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Complete Sale
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Thermal Invoice Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Sales Invoice Receipt"
      >
        {completedSale && (
          <div className="space-y-4">
            <div
              id="printable-receipt"
              className="rounded-lg border border-gray-300 bg-white p-5 font-mono text-xs text-gray-800 shadow-sm"
            >
              <div className="border-b border-dashed border-gray-400 pb-3 text-center">
                <h3 className="text-base font-bold uppercase tracking-wider text-black">
                  {completedSale.branch?.name || 'GREEN MART SUPERMARKET'}
                </h3>
                <p className="text-[11px] text-gray-600">
                  {completedSale.branch?.address || '124, Commercial Road, Central Market'}
                </p>
                <p className="text-[11px] text-gray-600">
                  Phone: {completedSale.branch?.phone || '+91 98765 43210'}
                </p>
                <p className="text-[11px] font-semibold text-gray-700">
                  GSTIN: GSTIN33AABCG1234F1Z5
                </p>
              </div>

              <div className="border-b border-dashed border-gray-400 py-2">
                <div className="flex justify-between">
                  <span>INVOICE:</span>
                  <span className="font-bold text-black">{completedSale.invoice_number}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>DATE:</span>
                  <span>{new Date(completedSale.order_date).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>CASHIER:</span>
                  <span>{completedSale.user?.name || 'Counter Staff'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>CUSTOMER:</span>
                  <span>{completedSale.customer?.name || 'Walk-in Customer'}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 py-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-300 text-[10px] uppercase text-gray-500">
                      <th>ITEM</th>
                      <th className="text-center">QTY</th>
                      <th className="text-right">PRICE</th>
                      <th className="text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {completedSale.items.map((item) => (
                      <tr key={item.id} className="py-1">
                        <td className="py-1">
                          <div className="font-medium text-black line-clamp-1">{item.product_name}</div>
                          {item.variant_name && (
                            <div className="text-[10px] text-gray-500">{item.variant_name}</div>
                          )}
                        </td>
                        <td className="text-center py-1">{item.quantity}</td>
                        <td className="text-right py-1">{formatMoney(item.unit_price)}</td>
                        <td className="text-right font-semibold py-1">{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 border-b border-dashed border-gray-400 py-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatMoney(completedSale.subtotal)}</span>
                </div>
                {Number(completedSale.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-{formatMoney(completedSale.discount_amount)}</span>
                  </div>
                )}
                {completedSale.is_gst_bill && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST (Central):</span>
                      <span>{formatMoney(completedSale.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST (State):</span>
                      <span>{formatMoney(completedSale.sgst_amount)}</span>
                    </div>
                  </>
                )}
                {Number(completedSale.round_off) !== 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Round Off:</span>
                    <span>{formatMoney(completedSale.round_off)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-black pt-1 border-t">
                  <span>GRAND TOTAL:</span>
                  <span>{formatMoney(completedSale.grand_total)}</span>
                </div>
              </div>

              <div className="py-2 space-y-1">
                {completedSale.payments?.map((p) => (
                  <div key={p.id} className="flex justify-between text-[11px]">
                    <span className="capitalize">{p.payment_method} Paid:</span>
                    <span>{formatMoney(p.amount)}</span>
                  </div>
                ))}
                {Number(completedSale.change_amount) > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Change Returned:</span>
                    <span>{formatMoney(completedSale.change_amount)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 text-center text-[10px] text-gray-500 border-t pt-2">
                <p>Thank you for shopping with us!</p>
                <p>Goods once sold can be returned within 7 days with original invoice.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print()
                }}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Print Invoice Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Open Cash Register Shift Modal */}
      <Modal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        title="Open Cash Drawer Shift"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Enter initial cash drawer float amount to open register session:
          </p>
          <Input
            type="number"
            min="0"
            label="Opening Cash Amount (₹)"
            value={openingBalanceInput || ''}
            onChange={(e) => setOpeningBalanceInput(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Opening Notes (Optional)"
            placeholder="e.g. 50x10, 20x20 coins"
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsOpenShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleOpenShift}>
              Open Register Shift
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Cash Register Shift Modal */}
      <Modal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        title="Close Cash Drawer Shift"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Expected Closing Balance:</span>
              <span className="font-bold text-gray-900">
                {formatMoney(Number(currentShift?.expected_balance ?? currentShift?.opening_balance))}
              </span>
            </div>
          </div>

          <Input
            type="number"
            min="0"
            label="Actual Cash Counted (₹)"
            value={actualClosingBalanceInput || ''}
            onChange={(e) => setActualClosingBalanceInput(parseFloat(e.target.value) || 0)}
          />

          <div className="rounded-xl border p-3 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Cash Difference:</span>
              <span
                className={cn(
                  'font-bold text-sm',
                  actualClosingBalanceInput -
                    Number(currentShift?.expected_balance ?? currentShift?.opening_balance ?? 0) ===
                    0
                    ? 'text-emerald-600'
                    : actualClosingBalanceInput -
                        Number(currentShift?.expected_balance ?? currentShift?.opening_balance ?? 0) <
                      0
                    ? 'text-rose-600'
                    : 'text-indigo-600'
                )}
              >
                {formatMoney(
                  actualClosingBalanceInput -
                    Number(currentShift?.expected_balance ?? currentShift?.opening_balance ?? 0)
                )}
                {actualClosingBalanceInput -
                  Number(currentShift?.expected_balance ?? currentShift?.opening_balance ?? 0) <
                  0 && ' (Shortage)'}
                {actualClosingBalanceInput -
                  Number(currentShift?.expected_balance ?? currentShift?.opening_balance ?? 0) >
                  0 && ' (Surplus)'}
              </span>
            </div>
          </div>

          <Input
            label="Closing Notes / Discrepancy Reason"
            placeholder="Explain difference if any..."
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsCloseShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-rose-600 hover:bg-rose-700" onClick={handleCloseShift}>
              Confirm Close Shift
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cash Movement Modal */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={movementType === 'cash_in' ? 'Record Cash In (Pay-in)' : 'Record Cash Out (Expense)'}
      >
        <div className="space-y-4">
          <Input
            type="number"
            min="0"
            label="Amount (₹)"
            value={movementAmount || ''}
            onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Reason / Purpose"
            placeholder={movementType === 'cash_in' ? 'e.g. Float addition' : 'e.g. Courier or tea expense'}
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsMovementModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordMovement}>
              Save Movement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={isInvoiceDetailsModalOpen}
        onClose={() => setIsInvoiceDetailsModalOpen(false)}
        title={`Invoice Details: ${selectedInvoiceDetails?.invoice_number}`}
      >
        {selectedInvoiceDetails && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3">
              <div>
                <span className="text-gray-500">Customer:</span>
                <p className="font-semibold text-gray-900">
                  {selectedInvoiceDetails.customer?.name || 'Walk-in Customer'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Cashier:</span>
                <p className="font-semibold text-gray-900">{selectedInvoiceDetails.user?.name || 'Cashier'}</p>
              </div>
              <div>
                <span className="text-gray-500">Order Date:</span>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedInvoiceDetails.order_date).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <Badge variant="success" size="sm">
                  {selectedInvoiceDetails.status}
                </Badge>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-[11px] text-gray-600">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedInvoiceDetails.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2">
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        {item.variant_name && <span className="text-gray-500">{item.variant_name}</span>}
                      </td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right">{formatMoney(item.unit_price)}</td>
                      <td className="p-2 text-right font-semibold">{formatMoney(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-right">
              <div>Subtotal: {formatMoney(selectedInvoiceDetails.subtotal)}</div>
              {Number(selectedInvoiceDetails.discount_amount) > 0 && (
                <div className="text-emerald-600">Discount: -{formatMoney(selectedInvoiceDetails.discount_amount)}</div>
              )}
              {selectedInvoiceDetails.is_gst_bill && (
                <div>Taxes: {formatMoney(selectedInvoiceDetails.tax_amount)}</div>
              )}
              <div className="text-base font-bold text-indigo-600">
                Grand Total: {formatMoney(selectedInvoiceDetails.grand_total)}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div>
                {selectedInvoiceDetails.status === 'completed' && canApplyDiscount && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setCancelSaleTarget(selectedInvoiceDetails)
                      setIsCancelModalOpen(true)
                    }}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Void / Cancel Sale
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsInvoiceDetailsModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setCompletedSale(selectedInvoiceDetails)
                    setIsReceiptModalOpen(true)
                  }}
                >
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Sale Cancellation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={`Cancel Sale: ${cancelSaleTarget?.invoice_number || ''}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            Are you sure you want to cancel this sale? Stock deductions will be restored to branch inventory, payments marked refunded, and cashier register totals updated.
          </p>
          <div>
            <label className="mb-1 block font-medium text-gray-700">Reason for Cancellation</label>
            <Input
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Customer returned goods / erroneous entry"
            />
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Keep Order
            </Button>
            <Button
              variant="danger"
              disabled={isSubmittingCancel}
              onClick={handleCancelSale}
            >
              {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SalesPage
