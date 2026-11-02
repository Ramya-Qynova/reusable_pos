import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit2,
  Tag,
  Layers,
  Scale,
  DollarSign,
  AlertCircle,
  Building2,
  X,
  Eye,
  Barcode,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Printer,
  Award,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table'
import { useNotification } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import productService from '../services/productService'
import type { Brand, Category, Product, ProductDashboardStats, TaxSlab, Unit } from '../types/products'
import { cn } from '../utils/cn'

type SubmoduleTab = 'catalog' | 'brands' | 'categories' | 'units' | 'pricing'

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]>; error_code?: string } } })?.response?.data
  if (data?.errors && typeof data.errors === 'object') {
    const errorStrings = Object.values(data.errors).flat().filter(Boolean)
    if (errorStrings.length > 0) {
      return errorStrings.join(' ')
    }
  }
  return data?.message || fallback
}

export const ProductsPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<SubmoduleTab>('catalog')

  // Master Data states
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([])
  const [branches, setBranches] = useState<{ id: number; name: string; branch_code: string; location?: string; is_main_branch: boolean }[]>([])
  const [stats, setStats] = useState<ProductDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('')
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Barcode Print Modal state
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null)
  const [barcodeSymbology, setBarcodeSymbology] = useState<string>('CODE128')
  const [barcodeCopies, setBarcodeCopies] = useState<number>(4)

  // Bulk Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [importResults, setImportResults] = useState<{ imported_count: number; failed_count: number; errors: string[] } | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Product Form state
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    hsn_code: '',
    category_id: '',
    brand_id: '',
    unit_id: '',
    tax_slab_id: '',
    tax_rate: '',
    cost_price: '',
    selling_price: '',
    mrp: '',
    minimum_stock: '5',
    description: '',
    image_url: '',
    has_variants: false,
    variants: [] as { variant_sku: string; variant_barcode: string; attributes: { key: string; value: string }[]; selling_price: string }[],
  })

  // Brand Form state
  const [brandForm, setBrandForm] = useState({
    name: '',
    code: '',
    description: '',
  })

  // Category Form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    parent_id: '',
    description: '',
  })

  // Unit Form state
  const [unitForm, setUnitForm] = useState({
    name: '',
    short_code: '',
    allow_decimals: false,
  })

  // Branch Pricing Form state
  const [selectedPricingBranch, setSelectedPricingBranch] = useState<number>(1)
  const [selectedPricingProduct, setSelectedPricingProduct] = useState<Product | null>(null)
  const [branchPriceInput, setBranchPriceInput] = useState<string>('')
  const [branchSpecialPriceInput, setBranchSpecialPriceInput] = useState<string>('')

  // Load master data (brands, categories, units, tax slabs, branches)
  const loadMasterData = useCallback(async () => {
    try {
      setIsLoading(true)
      const meta = await productService.getMeta().catch(() => null)
      if (meta) {
        setCategories(meta.categories || [])
        setBrands(meta.brands || [])
        setUnits(meta.units || [])
        setTaxSlabs(meta.tax_slabs || [])
        setBranches(meta.branches || [])
      } else {
        const [catList, brandList, unitList] = await Promise.all([
          productService.getCategories().catch(() => []),
          productService.getBrands().catch(() => []),
          productService.getUnits().catch(() => []),
        ])
        setCategories(catList)
        setBrands(brandList)
        setUnits(unitList)
      }

      // Load stats
      const statsData = await productService.getDashboardStats().catch(() => null)
      if (statsData) {
        setStats(statsData)
      }
    } catch (err: unknown) {
      console.warn('Could not load metadata from API:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load products catalog
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await productService.getProducts({
        search: searchQuery || undefined,
        category_id: selectedCategoryFilter ? parseInt(selectedCategoryFilter) : undefined,
        brand_id: selectedBrandFilter ? parseInt(selectedBrandFilter) : undefined,
        is_active: selectedStatusFilter === 'all' ? undefined : selectedStatusFilter === 'active',
      })
      setProducts(res.products)
      setSelectedPricingProduct((prev) => prev || (res.products.length > 0 ? res.products[0] : null))
    } catch (err: unknown) {
      console.warn('Could not load products:', err)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedCategoryFilter, selectedBrandFilter, selectedStatusFilter])

  useEffect(() => {
    loadMasterData()
    loadProducts()
  }, [loadMasterData, loadProducts])

  // Handle Tax Slab Change in Product Form -> Auto sync tax rate
  const handleTaxSlabChange = (slabId: string) => {
    const slab = taxSlabs.find((s) => s.id === parseInt(slabId))
    setProductForm((prev) => ({
      ...prev,
      tax_slab_id: slabId,
      tax_rate: slab ? slab.rate.toString() : prev.tax_rate,
    }))
  }

  // Generate Barcode using backend endpoint
  const handleGenerateBarcode = async () => {
    try {
      const res = await productService.generateBarcode('CODE128')
      setProductForm((prev) => ({ ...prev, barcode: res.barcode }))
      showNotification({
        title: 'Barcode Generated',
        message: `Assigned new barcode: ${res.barcode}`,
        type: 'success',
      })
    } catch {
      // Fallback generator
      const fallback = '890' + Math.floor(1000000000 + Math.random() * 9000000000).toString().substring(0, 9)
      setProductForm((prev) => ({ ...prev, barcode: fallback }))
    }
  }

  // Open Create/Edit Product Modal
  const openProductModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod)
      setProductForm({
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode || '',
        hsn_code: prod.hsn_code || '',
        category_id: prod.category_id?.toString() || '',
        brand_id: prod.brand_id ? prod.brand_id.toString() : '',
        unit_id: prod.unit_id?.toString() || '',
        tax_slab_id: prod.tax_slab_id ? prod.tax_slab_id.toString() : '',
        tax_rate: prod.tax_rate !== undefined ? prod.tax_rate.toString() : '0',
        cost_price: prod.cost_price?.toString() || '',
        selling_price: prod.selling_price?.toString() || '',
        mrp: prod.mrp ? prod.mrp.toString() : '',
        minimum_stock: prod.minimum_stock !== undefined ? prod.minimum_stock.toString() : '5',
        description: prod.description || '',
        image_url: prod.image_url || '',
        has_variants: !!prod.has_variants,
        variants: prod.variants?.map((v) => ({
          variant_sku: v.variant_sku,
          variant_barcode: v.variant_barcode || '',
          attributes: Object.entries(v.attributes_json || {}).map(([key, value]) => ({ key, value: String(value) })),
          selling_price: v.selling_price?.toString() || '0',
        })) || [],
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        name: '',
        sku: '',
        barcode: '',
        hsn_code: '',
        category_id: categories[0]?.id?.toString() || '',
        brand_id: brands[0]?.id?.toString() || '',
        unit_id: units[0]?.id?.toString() || '',
        tax_slab_id: taxSlabs[0]?.id?.toString() || '',
        tax_rate: taxSlabs[0]?.rate?.toString() || '0',
        cost_price: '',
        selling_price: '',
        mrp: '',
        minimum_stock: '5',
        description: '',
        image_url: '',
        has_variants: false,
        variants: [],
      })
    }
    setIsProductModalOpen(true)
  }

  // View Product Details
  const openProductDetails = async (prod: Product) => {
    try {
      const detailed = await productService.getProduct(prod.id).catch(() => prod)
      setViewingProduct(detailed)
      setIsDetailModalOpen(true)
    } catch {
      setViewingProduct(prod)
      setIsDetailModalOpen(true)
    }
  }

  // Toggle Product Status
  const handleToggleStatus = async (prod: Product) => {
    try {
      const updated = await productService.updateProduct(prod.id, { is_active: !prod.is_active })
      setProducts((prev) => prev.map((p) => (p.id === prod.id ? { ...p, is_active: updated.is_active } : p)))
      showNotification({
        title: updated.is_active ? 'Product Activated' : 'Product Deactivated',
        message: `${prod.name} status updated.`,
        type: 'success',
      })
      productService.getDashboardStats().then(setStats).catch(() => null)
    } catch (err: unknown) {
      showNotification({
        title: 'Status Update Failed',
        message: extractApiErrorMessage(err, 'Could not toggle product status.'),
        type: 'error',
      })
    }
  }

  // Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.name.trim()) {
      showNotification({ title: 'Validation Error', message: 'Please enter a product name.', type: 'warning' })
      return
    }
    if (!productForm.sku.trim()) {
      showNotification({ title: 'Validation Error', message: 'Please enter a product SKU.', type: 'warning' })
      return
    }
    const catId = parseInt(productForm.category_id)
    if (isNaN(catId)) {
      showNotification({ title: 'Validation Error', message: 'Please select a valid category from the dropdown.', type: 'warning' })
      return
    }
    const unitId = parseInt(productForm.unit_id)
    if (isNaN(unitId)) {
      showNotification({ title: 'Validation Error', message: 'Please select a valid unit of measure.', type: 'warning' })
      return
    }
    const costPrice = parseFloat(productForm.cost_price)
    if (isNaN(costPrice) || costPrice < 0) {
      showNotification({ title: 'Validation Error', message: 'Please enter a valid cost price (e.g. 50.00).', type: 'warning' })
      return
    }
    const sellingPrice = parseFloat(productForm.selling_price)
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      showNotification({ title: 'Validation Error', message: 'Please enter a valid selling price (e.g. 75.00).', type: 'warning' })
      return
    }

    try {
      const payload: Record<string, unknown> = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        barcode: productForm.barcode?.trim() || null,
        hsn_code: productForm.hsn_code?.trim() || null,
        category_id: catId,
        brand_id: productForm.brand_id ? parseInt(productForm.brand_id) : null,
        unit_id: unitId,
        tax_slab_id: productForm.tax_slab_id ? parseInt(productForm.tax_slab_id) : null,
        tax_rate: productForm.tax_rate ? parseFloat(productForm.tax_rate) : 0,
        cost_price: costPrice,
        selling_price: sellingPrice,
        mrp: productForm.mrp ? parseFloat(productForm.mrp) : null,
        minimum_stock: productForm.minimum_stock ? parseFloat(productForm.minimum_stock) : 0,
        description: productForm.description?.trim() || null,
        image_url: productForm.image_url?.trim() || null,
        has_variants: productForm.has_variants,
      }

      if (productForm.has_variants && productForm.variants.length > 0) {
        payload.variants = productForm.variants.map((v) => {
          const attributesObj: Record<string, string> = {}
          v.attributes.forEach((attr) => {
            if (attr.key && attr.value) {
              attributesObj[attr.key] = attr.value
            }
          })
          return {
            variant_sku: v.variant_sku,
            variant_barcode: v.variant_barcode || null,
            attributes_json: attributesObj,
            selling_price: parseFloat(v.selling_price),
          }
        })
      }

      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, payload)
        showNotification({
          title: 'Product Updated',
          message: `Product "${productForm.name}" updated successfully.`,
          type: 'success',
        })
      } else {
        await productService.createProduct(payload)
        showNotification({
          title: 'Product Created',
          message: `Product "${productForm.name}" added to catalog.`,
          type: 'success',
        })
      }

      setIsProductModalOpen(false)
      loadProducts()
      productService.getDashboardStats().then(setStats).catch(() => null)
    } catch (err: unknown) {
      const errorMsg = extractApiErrorMessage(err, 'Failed to save product.')
      showNotification({
        title: 'Save Failed',
        message: errorMsg,
        type: 'error',
      })
    }
  }

  // Soft Delete Product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await productService.deleteProduct(productToDelete.id)
      showNotification({
        title: 'Product Removed',
        message: `Product "${productToDelete.name}" was soft-deleted. Historical records preserved.`,
        type: 'info',
      })
      setIsDeleteConfirmOpen(false)
      setProductToDelete(null)
      loadProducts()
      productService.getDashboardStats().then(setStats).catch(() => null)
    } catch (err: unknown) {
      const errorMsg = extractApiErrorMessage(err, 'Could not delete product.')
      showNotification({
        title: 'Delete Failed',
        message: errorMsg,
        type: 'error',
      })
    }
  }

  // Brand Management Handlers
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingBrand) {
        await productService.updateBrand(editingBrand.id, brandForm)
        showNotification({ title: 'Brand Updated', message: `Brand "${brandForm.name}" updated.`, type: 'success' })
      } else {
        await productService.createBrand(brandForm)
        showNotification({ title: 'Brand Created', message: `Brand "${brandForm.name}" added.`, type: 'success' })
      }
      setIsBrandModalOpen(false)
      setEditingBrand(null)
      setBrandForm({ name: '', code: '', description: '' })
      loadMasterData()
    } catch (err: unknown) {
      showNotification({ title: 'Error', message: extractApiErrorMessage(err, 'Failed to save brand.'), type: 'error' })
    }
  }

  const handleDeleteBrand = async (brand: Brand) => {
    try {
      await productService.deleteBrand(brand.id)
      showNotification({ title: 'Brand Deleted', message: `Brand "${brand.name}" removed.`, type: 'info' })
      loadMasterData()
    } catch (err: unknown) {
      showNotification({ title: 'Delete Denied', message: extractApiErrorMessage(err, 'Cannot delete brand with associated products.'), type: 'error' })
    }
  }

  // Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await productService.updateCategory(editingCategory.id, {
          name: categoryForm.name,
          slug: categoryForm.slug ? categoryForm.slug.trim() : undefined,
          parent_id: categoryForm.parent_id ? parseInt(categoryForm.parent_id) : null,
          description: categoryForm.description || null,
        })
        showNotification({ title: 'Category Updated', message: `Category "${categoryForm.name}" updated successfully.`, type: 'success' })
      } else {
        await productService.createCategory({
          name: categoryForm.name,
          slug: categoryForm.slug ? categoryForm.slug.trim() : undefined,
          parent_id: categoryForm.parent_id ? parseInt(categoryForm.parent_id) : null,
          description: categoryForm.description || null,
        })
        showNotification({ title: 'Category Added', message: `Category "${categoryForm.name}" created successfully.`, type: 'success' })
      }
      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setCategoryForm({ name: '', slug: '', parent_id: '', description: '' })
      loadMasterData()
    } catch (err: unknown) {
      showNotification({ title: 'Error', message: extractApiErrorMessage(err, 'Failed to save category.'), type: 'error' })
    }
  }

  const handleDeleteCategory = async (cat: Category) => {
    try {
      await productService.deleteCategory(cat.id)
      showNotification({ title: 'Category Removed', message: `Category "${cat.name}" deleted.`, type: 'info' })
      loadMasterData()
    } catch (err: unknown) {
      showNotification({ title: 'Delete Denied', message: extractApiErrorMessage(err, 'Cannot delete category with active products.'), type: 'error' })
    }
  }

  // Unit Save
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUnit) {
        await productService.updateUnit(editingUnit.id, {
          name: unitForm.name,
          short_code: unitForm.short_code,
          allow_decimals: unitForm.allow_decimals,
        })
        showNotification({ title: 'Unit Updated', message: `Unit "${unitForm.name}" updated.`, type: 'success' })
      } else {
        await productService.createUnit({
          name: unitForm.name,
          short_code: unitForm.short_code,
          allow_decimals: unitForm.allow_decimals,
        })
        showNotification({ title: 'Unit Added', message: `Unit "${unitForm.name}" created.`, type: 'success' })
      }
      setIsUnitModalOpen(false)
      setEditingUnit(null)
      setUnitForm({ name: '', short_code: '', allow_decimals: false })
      loadMasterData()
    } catch (err: unknown) {
      showNotification({ title: 'Error', message: extractApiErrorMessage(err, 'Failed to save unit.'), type: 'error' })
    }
  }

  const handleDeleteUnit = async (u: Unit) => {
    try {
      await productService.deleteUnit(u.id)
      showNotification({ title: 'Unit Removed', message: `Unit "${u.name}" deleted.`, type: 'info' })
      loadMasterData()
    } catch (err: unknown) {
      showNotification({ title: 'Delete Denied', message: extractApiErrorMessage(err, 'Cannot delete unit assigned to products.'), type: 'error' })
    }
  }

  // Save Branch Price Override
  const handleSaveBranchPrice = async () => {
    if (!selectedPricingProduct || !branchPriceInput) return
    try {
      await productService.setBranchPrice(selectedPricingProduct.id, {
        branch_id: selectedPricingBranch,
        selling_price: parseFloat(branchPriceInput),
        special_price: branchSpecialPriceInput ? parseFloat(branchSpecialPriceInput) : null,
      })
      showNotification({
        title: 'Branch Pricing Updated',
        message: `Branch override configured for ${selectedPricingProduct.name}.`,
        type: 'success',
      })
      setBranchPriceInput('')
      setBranchSpecialPriceInput('')
      loadProducts()
    } catch (err: unknown) {
      showNotification({
        title: 'Update Denied',
        message: extractApiErrorMessage(err, 'Failed to update branch price.'),
        type: 'error',
      })
    }
  }

  // Bulk Export Handler
  const handleBulkExport = async () => {
    try {
      const data = await productService.bulkExport()
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute('download', `products_catalog_export_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      showNotification({ title: 'Export Generated', message: `Exported ${data.length} catalog products.`, type: 'success' })
    } catch (err: unknown) {
      showNotification({ title: 'Export Failed', message: extractApiErrorMessage(err, 'Failed to export products.'), type: 'error' })
    }
  }

  // Bulk Import Handler
  const handleExecuteImport = async () => {
    try {
      setIsImporting(true)
      setImportResults(null)
      const parsed = JSON.parse(importJsonText)
      if (!Array.isArray(parsed)) {
        throw new Error('Data format must be an array of product objects.')
      }
      const res = await productService.bulkImport(parsed)
      setImportResults(res)
      if (res.imported_count > 0) {
        showNotification({
          title: 'Import Successful',
          message: `Successfully imported ${res.imported_count} products.`,
          type: 'success',
        })
        loadProducts()
        loadMasterData()
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || extractApiErrorMessage(err, 'Failed to process import.')
      showNotification({ title: 'Import Failed', message: msg, type: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  // Print Barcode Stickers
  const handlePrintBarcode = (prod: Product) => {
    setBarcodeProduct(prod)
    setIsBarcodeModalOpen(true)
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title="Products & Catalog Master"
        subtitle="Complete product lifecycle: catalog dashboard, brands, categories, units, variant matrices, barcodes, and branch price overrides."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'catalog' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleBulkExport}
                >
                  Export Catalog
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
                  Bulk Import
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => openProductModal()}
                >
                  Add Product
                </Button>
              </>
            )}
            {activeTab === 'brands' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingBrand(null)
                  setBrandForm({ name: '', code: '', description: '' })
                  setIsBrandModalOpen(true)
                }}
              >
                Add Brand
              </Button>
            )}
            {activeTab === 'categories' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingCategory(null)
                  setCategoryForm({ name: '', slug: '', parent_id: '', description: '' })
                  setIsCategoryModalOpen(true)
                }}
              >
                Add Category
              </Button>
            )}
            {activeTab === 'units' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingUnit(null)
                  setUnitForm({ name: '', short_code: '', allow_decimals: false })
                  setIsUnitModalOpen(true)
                }}
              >
                Add Unit
              </Button>
            )}
          </div>
        }
      />

      {/* Product Dashboard KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Items</span>
              <Package className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{stats.total_products}</div>
            <span className="text-[10px] text-slate-500">Master Catalog</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-emerald-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">{stats.active_products}</div>
            <span className="text-[10px] text-emerald-600">POS Ready</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-amber-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Low Stock</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 mt-1 font-mono">{stats.low_stock_count}</div>
            <span className="text-[10px] text-amber-600">Below Reorder</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-rose-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">Out of Stock</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600 mt-1 font-mono">{stats.out_of_stock_count}</div>
            <span className="text-[10px] text-rose-600">Critical Action</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-purple-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-purple-700 uppercase tracking-wider">Categories</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-700 mt-1 font-mono">{stats.total_categories}</div>
            <span className="text-[10px] text-purple-600">Classification</span>
          </Card>

          <Card className="p-3.5 border-slate-200/80 shadow-xs bg-linear-to-br from-white to-blue-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">Brands</span>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700 mt-1 font-mono">{stats.total_brands}</div>
            <span className="text-[10px] text-blue-600">Manufacturers</span>
          </Card>
        </div>
      )}

      {/* Navigation Submodule Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar" aria-label="Submodules">
          {[
            { id: 'catalog', label: 'Product Catalog', icon: Package },
            { id: 'brands', label: 'Brands', icon: Award },
            { id: 'categories', label: 'Categories', icon: Layers },
            { id: 'units', label: 'Units of Measure', icon: Scale },
            { id: 'pricing', label: 'Branch Price Rules', icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SubmoduleTab)}
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
      {/* TAB 1: PRODUCT CATALOG */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-3.5 border-slate-200/80 shadow-xs">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SKU, name, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060] focus:border-[#D45060]"
                />
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  aria-label="Filter by Category"
                  className="w-full sm:w-40 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedBrandFilter}
                  onChange={(e) => setSelectedBrandFilter(e.target.value)}
                  aria-label="Filter by Brand"
                  className="w-full sm:w-40 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                >
                  <option value="">All Brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  aria-label="Filter by Status"
                  className="w-full sm:w-32 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <Button variant="outline" size="sm" onClick={() => loadProducts()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Products Table */}
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name & Code</TableHead>
                  <TableHead>Brand / Category</TableHead>
                  <TableHead>MRP / Cost</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      {isLoading ? 'Loading catalog products...' : 'No products found. Click "Add Product" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-md object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                              {p.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div>{p.name}</div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 font-normal">
                              <span>SKU: {p.sku}</span>
                              {p.barcode && <span>• Barcode: {p.barcode}</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-slate-800">{p.brand?.name || 'Generic'}</div>
                        <div className="text-[11px] text-slate-500">{p.category?.name || 'Unassigned'} • {p.unit?.short_code || 'pcs'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono text-slate-700">Cost: ₹{p.cost_price}</div>
                        {p.mrp && <div className="text-[11px] font-mono text-slate-400">MRP: ₹{p.mrp}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-bold text-slate-900">₹{p.selling_price}</div>
                        {p.effective_price && p.effective_price !== p.selling_price && (
                          <div className="text-[10px] text-amber-600 font-medium">Branch: ₹{p.effective_price}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {p.tax_rate ?? 0}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{p.minimum_stock}</TableCell>
                      <TableCell>
                        {p.has_variants && p.variants && p.variants.length > 0 ? (
                          <Badge variant="info" size="sm">
                            {p.variants.length} Variants
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Standard</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className="cursor-pointer"
                          title="Click to toggle active status"
                        >
                          <Badge variant={p.is_active ? 'success' : 'neutral'} size="sm">
                            {p.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openProductDetails(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="View Product Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintBarcode(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Generate & Print Barcode Labels"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openProductModal(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductToDelete(p)
                              setIsDeleteConfirmOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Soft Delete Product"
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BRANDS */}
      {/* ======================================================== */}
      {activeTab === 'brands' && (
        <Card className="border-slate-200/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Products Linked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No brands found. Click "Add Brand" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-600" />
                      <span>{b.name}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{b.code || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-sm truncate">{b.description || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {b.products_count ?? 0} Products
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.is_active ? 'success' : 'neutral'} size="sm">
                        {b.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBrand(b)
                            setBrandForm({
                              name: b.name,
                              code: b.code || '',
                              description: b.description || '',
                            })
                            setIsBrandModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Brand"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBrand(b)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete Brand"
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
      {/* TAB 3: CATEGORIES */}
      {/* ======================================================== */}
      {activeTab === 'categories' && (
        <Card className="border-slate-200/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Hierarchy / Parent</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#D45060]" />
                    <span>{c.name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{c.slug}</TableCell>
                  <TableCell>
                    {c.parent ? (
                      <Badge variant="info" size="sm">
                        Subcategory of {c.parent.name}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Root Category
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs max-w-xs truncate">{c.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'success' : 'neutral'} size="sm">
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(c)
                          setCategoryForm({
                            name: c.name,
                            slug: c.slug,
                            parent_id: c.parent_id ? String(c.parent_id) : '',
                            description: c.description || '',
                          })
                          setIsCategoryModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 4: UNITS OF MEASURE */}
      {/* ======================================================== */}
      {activeTab === 'units' && (
        <Card className="border-slate-200/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Name</TableHead>
                <TableHead>Short Code</TableHead>
                <TableHead>Quantity Support</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>{u.name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-700 uppercase">{u.short_code}</TableCell>
                  <TableCell>
                    {u.allow_decimals ? (
                      <Badge variant="success" size="sm">
                        Decimals Allowed (e.g. 1.250 kg)
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Whole Units Only (e.g. 1 pcs)
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUnit(u)
                          setUnitForm({
                            name: u.name,
                            short_code: u.short_code,
                            allow_decimals: u.allow_decimals,
                          })
                          setIsUnitModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Edit Unit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUnit(u)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 5: BRANCH PRICING & OVERRIDES */}
      {/* ======================================================== */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="p-5 border-slate-200/80 shadow-xs md:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D45060]" />
              <span>Select Store Branch</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Branch</label>
              <select
                value={selectedPricingBranch}
                onChange={(e) => setSelectedPricingBranch(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.branch_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Catalog Item</label>
              <select
                value={selectedPricingProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === parseInt(e.target.value))
                  setSelectedPricingProduct(p || null)
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (SKU: {p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>Pricing Fallback Rule</span>
              </div>
              <p>If no branch override is active, the system automatically uses the master catalog price.</p>
            </div>
          </Card>

          <Card className="p-5 border-slate-200/80 shadow-xs md:col-span-2 space-y-5">
            {selectedPricingProduct ? (
              <>
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{selectedPricingProduct.name}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {selectedPricingProduct.sku}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Master Selling Price</span>
                    <div className="text-lg font-black text-slate-900 font-mono">₹{selectedPricingProduct.selling_price}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch Selling Price (₹) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={`e.g. ${selectedPricingProduct.selling_price}`}
                      value={branchPriceInput}
                      onChange={(e) => setBranchPriceInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Special Promotional Price (Optional)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 59.00"
                      value={branchSpecialPriceInput}
                      onChange={(e) => setBranchSpecialPriceInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <Button variant="primary" size="md" onClick={handleSaveBranchPrice}>
                    Save Branch Price Override
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">Select a catalog product to configure branch pricing.</div>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT PRODUCT */}
      {/* ======================================================== */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Edit Product Master' : 'Add New Product to Catalog'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
              <Input
                required
                placeholder="e.g. Amul Pure Ghee 1L Tin"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Item Code *</label>
              <Input
                required
                placeholder="e.g. AMUL-GHEE-1L"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Barcode / EAN</label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[11px] text-[#D45060] font-medium flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Gen
                </button>
              </div>
              <Input
                placeholder="e.g. 8901262010053"
                value={productForm.barcode}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                required
                value={productForm.category_id}
                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Manufacturer</label>
              <select
                value={productForm.brand_id}
                onChange={(e) => setProductForm({ ...productForm, brand_id: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                <option value="">No Brand (Generic)</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure *</label>
              <select
                required
                value={productForm.unit_id}
                onChange={(e) => setProductForm({ ...productForm, unit_id: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.short_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HSN / SAC Code</label>
              <Input
                placeholder="e.g. 04059020"
                value={productForm.hsn_code}
                onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Slab</label>
              <select
                value={productForm.tax_slab_id}
                onChange={(e) => handleTaxSlabChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                <option value="">No Tax Slab (0%)</option>
                {taxSlabs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rate}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={productForm.tax_rate}
                onChange={(e) => setProductForm({ ...productForm, tax_rate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost / Purchase Price (₹) *</label>
              <Input
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                value={productForm.cost_price}
                onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
              <Input
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                value={productForm.selling_price}
                onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Retail Price (MRP ₹)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={productForm.mrp}
                onChange={(e) => setProductForm({ ...productForm, mrp: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Stock Alert</label>
              <Input
                type="number"
                step="1"
                placeholder="5"
                value={productForm.minimum_stock}
                onChange={(e) => setProductForm({ ...productForm, minimum_stock: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Image URL</label>
              <Input
                placeholder="https://example.com/images/product.jpg"
                value={productForm.image_url}
                onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
              <textarea
                rows={2}
                placeholder="Detailed description, ingredients, warranty, or notes..."
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              />
            </div>
          </div>

          {/* Variants Toggle & Builder */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Variable Product / Multiple SKUs</span>
                <p className="text-[11px] text-slate-500">Enable size, color, pack sizes, or multi-attribute variants</p>
              </div>
              <input
                type="checkbox"
                checked={productForm.has_variants}
                onChange={(e) => setProductForm({ ...productForm, has_variants: e.target.checked })}
                className="w-4 h-4 text-[#D45060] rounded-sm focus:ring-[#D45060]"
              />
            </div>

            {productForm.has_variants && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Variant Matrix</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProductForm((prev) => ({
                        ...prev,
                        variants: [
                          ...prev.variants,
                          {
                            variant_sku: `${prev.sku || 'SKU'}-V${prev.variants.length + 1}`,
                            variant_barcode: '',
                            attributes: [{ key: 'Size', value: 'Standard' }],
                            selling_price: prev.selling_price || '0',
                          },
                        ],
                      }))
                    }}
                  >
                    + Add Variant
                  </Button>
                </div>

                {productForm.variants.map((v, vIdx) => (
                  <div key={vIdx} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Variant #{vIdx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm((prev) => ({
                            ...prev,
                            variants: prev.variants.filter((_, idx) => idx !== vIdx),
                          }))
                        }}
                        className="text-rose-500 hover:text-rose-700 text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500">Variant SKU *</label>
                        <Input
                          value={v.variant_sku}
                          onChange={(e) => {
                            const newVariants = [...productForm.variants]
                            newVariants[vIdx].variant_sku = e.target.value
                            setProductForm({ ...productForm, variants: newVariants })
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Variant Barcode</label>
                        <Input
                          value={v.variant_barcode}
                          onChange={(e) => {
                            const newVariants = [...productForm.variants]
                            newVariants[vIdx].variant_barcode = e.target.value
                            setProductForm({ ...productForm, variants: newVariants })
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Selling Price (₹) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={v.selling_price}
                          onChange={(e) => {
                            const newVariants = [...productForm.variants]
                            newVariants[vIdx].selling_price = e.target.value
                            setProductForm({ ...productForm, variants: newVariants })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsProductModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: PRODUCT DETAILS VIEW */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setViewingProduct(null)
        }}
        title="Product Master Record"
        maxWidth="lg"
      >
        {viewingProduct && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {viewingProduct.image_url ? (
                <img src={viewingProduct.image_url} alt={viewingProduct.name} className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center text-slate-400 font-bold text-xl border border-slate-200">
                  {viewingProduct.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{viewingProduct.name}</h3>
                  <Badge variant={viewingProduct.is_active ? 'success' : 'neutral'} size="sm">
                    {viewingProduct.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-slate-400">SKU:</span> <span className="font-mono font-medium">{viewingProduct.sku}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Barcode:</span> <span className="font-mono font-medium">{viewingProduct.barcode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">HSN:</span> <span className="font-medium">{viewingProduct.hsn_code || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Brand:</span> <span className="font-medium">{viewingProduct.brand?.name || 'Generic'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Category:</span> <span className="font-medium">{viewingProduct.category?.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Unit:</span> <span className="font-medium">{viewingProduct.unit?.name} ({viewingProduct.unit?.short_code})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Cost Price</div>
                <div className="text-lg font-mono font-bold text-slate-700 mt-0.5">₹{viewingProduct.cost_price}</div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Selling Price</div>
                <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">₹{viewingProduct.selling_price}</div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">MRP</div>
                <div className="text-lg font-mono font-bold text-emerald-600 mt-0.5">₹{viewingProduct.mrp || viewingProduct.selling_price}</div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Tax Rate</div>
                <div className="text-lg font-mono font-bold text-indigo-600 mt-0.5">{viewingProduct.tax_rate ?? 0}%</div>
              </div>
            </div>

            {viewingProduct.description && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                <div className="font-semibold text-slate-700 mb-1">Description & Specifications:</div>
                <p className="whitespace-pre-line">{viewingProduct.description}</p>
              </div>
            )}

            {viewingProduct.has_variants && viewingProduct.variants && viewingProduct.variants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Product Variants ({viewingProduct.variants.length})</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant SKU</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Attributes</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingProduct.variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs font-medium">{v.variant_sku}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{v.variant_barcode || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {Object.entries(v.attributes_json || {}).map(([k, val]) => (
                              <Badge key={k} variant="neutral" size="sm" className="mr-1">
                                {k}: {val}
                              </Badge>
                            ))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">₹{v.selling_price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Barcode className="w-4 h-4" />}
                onClick={() => {
                  setIsDetailModalOpen(false)
                  handlePrintBarcode(viewingProduct)
                }}
              >
                Print Barcode
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={() => {
                  setIsDetailModalOpen(false)
                  openProductModal(viewingProduct)
                }}
              >
                Edit Product
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: BARCODE PRINT & SCAN GENERATOR */}
      {/* ======================================================== */}
      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={() => {
          setIsBarcodeModalOpen(false)
          setBarcodeProduct(null)
        }}
        title="Barcode Label Printing"
        maxWidth="md"
      >
        {barcodeProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Symbology</label>
                <select
                  value={barcodeSymbology}
                  onChange={(e) => setBarcodeSymbology(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="CODE128">Code 128 (Universal)</option>
                  <option value="EAN13">EAN-13 (Retail Standard)</option>
                  <option value="QR">QR 2D Matrix</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Copies to Print</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={barcodeCopies}
                  onChange={(e) => setBarcodeCopies(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Label Preview */}
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Preview (50mm x 25mm Label)</span>
              <div className="w-64 p-3 bg-white rounded-lg shadow-sm border border-slate-300 text-center space-y-1">
                <div className="font-bold text-xs text-slate-900 truncate">{barcodeProduct.name}</div>
                <div className="py-2 flex items-center justify-center">
                  <div className="tracking-[3px] font-mono text-2xl font-black text-slate-900 select-none">
                    ||| | |||| | ||| |
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800">{barcodeProduct.barcode || barcodeProduct.sku}</div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-500">{barcodeProduct.brand?.name || 'GENERIC'}</span>
                  <span className="font-bold text-slate-900">MRP ₹{barcodeProduct.mrp || barcodeProduct.selling_price}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsBarcodeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => {
                  window.print()
                  showNotification({
                    title: 'Job Sent to Printer',
                    message: `Sent ${barcodeCopies} barcode sticker labels to thermal printer.`,
                    type: 'success',
                  })
                  setIsBarcodeModalOpen(false)
                }}
              >
                Print {barcodeCopies} Labels
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: BULK IMPORT */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Catalog Products"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Paste a valid JSON array of product objects to import in bulk. Existing items with identical SKU or Barcode will be safely rejected to avoid duplicates.
          </p>

          <div>
            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={`[\n  {\n    "name": "Tata Tea Gold 500g",\n    "sku": "TATA-TEA-500G",\n    "barcode": "8901052002011",\n    "category_id": 1,\n    "unit_id": 1,\n    "cost_price": 280,\n    "selling_price": 320,\n    "mrp": 350,\n    "minimum_stock": 10\n  }\n]`}
              className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D45060]"
            />
          </div>

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

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT BRAND */}
      {/* ======================================================== */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false)
          setEditingBrand(null)
        }}
        title={editingBrand ? 'Edit Brand' : 'Add New Brand'}
      >
        <form onSubmit={handleSaveBrand} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
            <Input
              required
              placeholder="e.g. Nestle, Amul, Britannia"
              value={brandForm.name}
              onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Code / Prefix</label>
            <Input
              placeholder="e.g. BR-AMUL"
              value={brandForm.code}
              onChange={(e) => setBrandForm({ ...brandForm, code: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <Input
              placeholder="Brief description or manufacturer notes..."
              value={brandForm.description}
              onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsBrandModalOpen(false)
                setEditingBrand(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingBrand ? 'Save Changes' : 'Save Brand'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT CATEGORY */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false)
          setEditingCategory(null)
        }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
            <Input
              required
              placeholder="e.g. Beverages"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Slug / Identifier (Optional)</label>
            <Input
              placeholder="Auto-generated from name if omitted"
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Category (Optional)</label>
            <select
              value={categoryForm.parent_id}
              onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
            >
              <option value="">None (Top Level Root Category)</option>
              {categories
                .filter((c) => !editingCategory || c.id !== editingCategory.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <Input
              placeholder="Brief description..."
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCategoryModalOpen(false)
                setEditingCategory(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingCategory ? 'Save Changes' : 'Save Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT UNIT */}
      {/* ======================================================== */}
      <Modal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title={editingUnit ? 'Edit Unit' : 'Add Unit of Measure'}
      >
        <form onSubmit={handleSaveUnit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Name *</label>
            <Input
              required
              placeholder="e.g. Kilogram"
              value={unitForm.name}
              onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Short Code *</label>
            <Input
              required
              placeholder="e.g. kg"
              value={unitForm.short_code}
              onChange={(e) => setUnitForm({ ...unitForm, short_code: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="allowDecimals"
              checked={unitForm.allow_decimals}
              onChange={(e) => setUnitForm({ ...unitForm, allow_decimals: e.target.checked })}
              className="w-4 h-4 text-[#D45060] rounded-sm focus:ring-[#D45060]"
            />
            <label htmlFor="allowDecimals" className="text-xs font-medium text-slate-700 cursor-pointer">
              Allow decimal quantities (e.g. 0.500 kg, 1.250 ltr)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsUnitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingUnit ? 'Save Changes' : 'Create Unit'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProduct}
        title="Soft Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? It will be removed from active billing, but historical sales records will remain preserved.`}
        confirmText="Delete Product"
        variant="danger"
      />
    </div>
  )
}

export default ProductsPage
