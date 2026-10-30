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
import type { Category, Product, ProductVariant, TaxSlab, Unit } from '../types/products'
import { cn } from '../utils/cn'

type SubmoduleTab = 'catalog' | 'categories' | 'units' | 'pricing'

export const ProductsPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<SubmoduleTab>('catalog')

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([])
  const [branches, setBranches] = useState<{ id: number; name: string; branch_code: string; location?: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('')

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Product Form state
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    hsn_code: '',
    category_id: '',
    unit_id: '',
    tax_slab_id: '',
    tax_rate: '',
    cost_price: '',
    selling_price: '',
    minimum_stock: '5',
    has_variants: false,
    variants: [] as { variant_sku: string; variant_barcode: string; attributes: { key: string; value: string }[]; selling_price: string }[],
  })

  // Category Form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
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

  // Load all foundational data in a single fast call
  const loadMasterData = useCallback(async () => {
    try {
      setIsLoading(true)
      const meta = await productService.getMeta().catch(() => null)
      if (meta) {
        setCategories(meta.categories)
        setUnits(meta.units)
        setTaxSlabs(meta.tax_slabs)
        setBranches(meta.branches)
      } else {
        const [catList, unitList] = await Promise.all([
          productService.getCategories().catch(() => []),
          productService.getUnits().catch(() => []),
        ])
        setCategories(catList)
        setUnits(unitList)
      }
    } catch (err: unknown) {
      console.warn('Could not load metadata from API:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await productService.getProducts({
        search: searchQuery || undefined,
        category_id: selectedCategoryFilter ? parseInt(selectedCategoryFilter) : undefined,
      })
      setProducts(res.products)
      setSelectedPricingProduct((prev) => prev || (res.products.length > 0 ? res.products[0] : null))
    } catch (err: unknown) {
      console.warn('Could not load products:', err)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedCategoryFilter])

  useEffect(() => {
    if (isAuthenticated) {
      loadMasterData()
      loadProducts()
    }
  }, [isAuthenticated, loadMasterData, loadProducts])

  // Handle Tax Slab Change in Product Form -> Auto sync tax rate
  const handleTaxSlabChange = (slabId: string) => {
    const slab = taxSlabs.find((s) => s.id === parseInt(slabId))
    setProductForm((prev) => ({
      ...prev,
      tax_slab_id: slabId,
      tax_rate: slab ? slab.rate.toString() : prev.tax_rate,
    }))
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
        category_id: prod.category_id.toString(),
        unit_id: prod.unit_id.toString(),
        tax_slab_id: prod.tax_slab_id ? prod.tax_slab_id.toString() : '',
        tax_rate: prod.tax_rate ? prod.tax_rate.toString() : '0',
        cost_price: prod.cost_price.toString(),
        selling_price: prod.selling_price.toString(),
        minimum_stock: prod.minimum_stock.toString(),
        has_variants: prod.has_variants,
        variants: prod.variants?.map((v) => ({
          variant_sku: v.variant_sku,
          variant_barcode: v.variant_barcode || '',
          attributes: Object.entries(v.attributes_json || {}).map(([key, value]) => ({ key, value: String(value) })),
          selling_price: v.selling_price.toString(),
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
        unit_id: units[0]?.id?.toString() || '',
        tax_slab_id: taxSlabs[0]?.id?.toString() || '',
        tax_rate: taxSlabs[0]?.rate?.toString() || '0',
        cost_price: '',
        selling_price: '',
        minimum_stock: '5',
        has_variants: false,
        variants: [],
      })
    }
    setIsProductModalOpen(true)
  }

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: Record<string, unknown> = {
        name: productForm.name,
        sku: productForm.sku,
        barcode: productForm.barcode || null,
        hsn_code: productForm.hsn_code || null,
        category_id: parseInt(productForm.category_id),
        unit_id: parseInt(productForm.unit_id),
        tax_slab_id: productForm.tax_slab_id ? parseInt(productForm.tax_slab_id) : null,
        tax_rate: productForm.tax_rate ? parseFloat(productForm.tax_rate) : 0,
        cost_price: parseFloat(productForm.cost_price),
        selling_price: parseFloat(productForm.selling_price),
        minimum_stock: parseFloat(productForm.minimum_stock),
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
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save product.'
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
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not delete product.'
      showNotification({
        title: 'Delete Failed',
        message: errorMsg,
        type: 'error',
      })
    }
  }

  // Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await productService.createCategory({
        name: categoryForm.name,
        parent_id: categoryForm.parent_id ? parseInt(categoryForm.parent_id) : null,
        description: categoryForm.description || null,
      })
      showNotification({
        title: 'Category Added',
        message: `Category "${categoryForm.name}" created successfully.`,
        type: 'success',
      })
      setIsCategoryModalOpen(false)
      setCategoryForm({ name: '', parent_id: '', description: '' })
      loadMasterData()
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create category.'
      showNotification({
        title: 'Error',
        message: errorMsg,
        type: 'error',
      })
    }
  }

  // Category Delete
  const handleDeleteCategory = async (cat: Category) => {
    try {
      await productService.deleteCategory(cat.id)
      showNotification({
        title: 'Category Removed',
        message: `Category "${cat.name}" deleted.`,
        type: 'info',
      })
      loadMasterData()
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cannot delete category with active products.'
      showNotification({
        title: 'Delete Denied',
        message: errorMsg,
        type: 'error',
      })
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
        showNotification({
          title: 'Unit Updated',
          message: `Unit "${unitForm.name}" updated.`,
          type: 'success',
        })
      } else {
        await productService.createUnit({
          name: unitForm.name,
          short_code: unitForm.short_code,
          allow_decimals: unitForm.allow_decimals,
        })
        showNotification({
          title: 'Unit Added',
          message: `Unit "${unitForm.name}" created.`,
          type: 'success',
        })
      }
      setIsUnitModalOpen(false)
      setEditingUnit(null)
      setUnitForm({ name: '', short_code: '', allow_decimals: false })
      loadMasterData()
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save unit.'
      showNotification({
        title: 'Error',
        message: errorMsg,
        type: 'error',
      })
    }
  }

  // Unit Delete
  const handleDeleteUnit = async (u: Unit) => {
    try {
      await productService.deleteUnit(u.id)
      showNotification({
        title: 'Unit Removed',
        message: `Unit "${u.name}" deleted.`,
        type: 'info',
      })
      loadMasterData()
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cannot delete unit assigned to products.'
      showNotification({
        title: 'Delete Denied',
        message: errorMsg,
        type: 'error',
      })
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
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update branch price.'
      showNotification({
        title: 'Update Denied',
        message: errorMsg,
        type: 'error',
      })
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title="Products & Catalog Master"
        subtitle="Manage product master, categories, units of measurement, barcodes, and branch price overrides."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'catalog' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => openProductModal()}
              >
                Add Product
              </Button>
            )}
            {activeTab === 'categories' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setCategoryForm({ name: '', parent_id: '', description: '' })
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

      {/* Navigation Submodule Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar" aria-label="Submodules">
          {[
            { id: 'catalog', label: 'Product Catalog', icon: Package },
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SKU, name, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060] focus:border-[#D45060]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  aria-label="Filter by Category"
                  className="w-full sm:w-48 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <Button variant="outline" size="sm" onClick={() => loadProducts()}>
                  Refresh
                </Button>
              </div>
            </div>
          </Card>

          {/* Products Table */}
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU & Barcode</TableHead>
                  <TableHead>Category / Unit</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      {isLoading ? 'Loading catalog products...' : 'No products found. Click "Add Product" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-slate-800">
                        <div>{p.name}</div>
                        {p.hsn_code && <span className="text-[11px] text-slate-400 font-normal">HSN: {p.hsn_code}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs text-slate-700">{p.sku}</div>
                        {p.barcode && <div className="text-[11px] font-mono text-slate-400">{p.barcode}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-700">{p.category?.name || 'Unassigned'}</div>
                        <div className="text-[11px] text-slate-400">Unit: {p.unit?.short_code || 'pcs'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {p.tax_rate ?? 0}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600">₹{p.cost_price}</TableCell>
                      <TableCell>
                        <div className="font-mono font-bold text-slate-900">₹{p.selling_price}</div>
                        {p.effective_price && p.effective_price !== p.selling_price && (
                          <div className="text-[11px] text-amber-600 font-medium">Branch: ₹{p.effective_price}</div>
                        )}
                      </TableCell>
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
                        <Badge variant={p.is_active ? 'success' : 'neutral'} size="sm">
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
      {/* TAB 2: CATEGORIES HIERARCHY */}
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
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 3: UNITS OF MEASURE */}
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
      {/* TAB 4: BRANCH PRICING & OVERRIDES */}
      {/* ======================================================== */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left: Branch & Product Selection */}
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

          {/* Right: Price Configuration Card */}
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
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
              <Input
                required
                placeholder="e.g. Whole Milk 1L"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU *</label>
              <Input
                required
                placeholder="e.g. MILK-1L"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode</label>
              <Input
                placeholder="e.g. 8901234567890"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Slab</label>
              <select
                value={productForm.tax_slab_id}
                onChange={(e) => handleTaxSlabChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
              >
                <option value="">No Tax Slab</option>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (₹) *</label>
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
          </div>

          {/* Variants Toggle & Builder */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Has Variants</span>
                <p className="text-[11px] text-slate-500">Enable size, color, or other attributes</p>
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
                  <span className="text-xs font-semibold text-slate-700">Variant Combinations</span>
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
                            variant_sku: `${prev.sku}-V${prev.variants.length + 1}`,
                            variant_barcode: '',
                            attributes: [{ key: 'Size', value: 'M' }],
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
                        <label className="text-[10px] text-slate-500">Variant SKU</label>
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
                        <label className="text-[10px] text-slate-500">Selling Price (₹)</label>
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
      {/* MODAL: ADD CATEGORY */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Category"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Category (Optional)</label>
            <select
              value={categoryForm.parent_id}
              onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D45060]"
            >
              <option value="">None (Top Level Root Category)</option>
              {categories.map((c) => (
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
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Category
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
