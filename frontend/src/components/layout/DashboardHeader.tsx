import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store,
  MapPin,
  ChevronDown,
  Check,
  Search,
  X,
  Package,
  Receipt,
  User,
  Building2,
  ArrowRight,
} from 'lucide-react'
import { useConfig } from '../../context/ConfigContext'
import { useNotification } from '../../context/NotificationContext'
import { DatePicker } from '../common/DatePicker'
import { cn } from '../../utils/cn'

interface BranchOption {
  id: string
  name: string
  location: string
  isMain?: boolean
}

const AVAILABLE_BRANCHES: BranchOption[] = [
  { id: 'main', name: 'Main Branch', location: 'Downtown Central Market', isMain: true },
  { id: 'north', name: 'North Annex', location: 'North Avenue Commercial Hub', isMain: false },
  { id: 'metro', name: 'Metro Center', location: 'Sector 4 City Galleria', isMain: false },
  { id: 'airport', name: 'Airport Express', location: 'Terminal 2 Departure Hall', isMain: false },
]

// Mock searchable entities for prominent global search
const SEARCHABLE_ITEMS = [
  { type: 'product', title: 'Organic Whole Milk (1L)', code: 'MILK-001', detail: '₹65.00 • In Stock (42)' },
  { type: 'product', title: 'Farm Fresh Brown Eggs (12pk)', code: 'EGG-012', detail: '₹110.00 • Low Stock (6)' },
  { type: 'product', title: 'Whole Wheat Sourdough Bread', code: 'BRD-004', detail: '₹55.00 • In Stock (18)' },
  { type: 'product', title: 'Arabica Roast Coffee Beans (500g)', code: 'COF-089', detail: '₹420.00 • In Stock (25)' },
  { type: 'product', title: 'Greek Plain Yogurt (400g)', code: 'YOG-015', detail: '₹95.00 • In Stock (30)' },
  { type: 'order', title: 'Order #ORD-98234', code: '₹1,450.00', detail: 'Cash • Completed • 10:45 AM' },
  { type: 'order', title: 'Order #ORD-98233', code: '₹820.00', detail: 'UPI / QR • Completed • 10:32 AM' },
  { type: 'order', title: 'Order #ORD-98232', code: '₹3,120.00', detail: 'Card • Completed • 10:14 AM' },
  { type: 'customer', title: 'John Doe', code: '+91 98111 22334', detail: 'Regular Buyer • Active' },
  { type: 'customer', title: 'Sarah Jenkins', code: '+91 98222 33445', detail: 'Frequent Buyer • Active' },
  { type: 'customer', title: 'TechCorp Solutions', code: '+91 98777 66554', detail: 'Credit Account • ₹14,500' },
  { type: 'supplier', title: 'Fresh Farm Agro Wholesale', code: 'SUP-00001', detail: 'Fresh Produce Vendor • Active' },
  { type: 'supplier', title: 'Supreme Dairy & Poultry Co.', code: 'SUP-00002', detail: 'Dairy & Eggs Supplier • Active' },
]

export interface DashboardHeaderProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const navigate = useNavigate()
  const { client, updateBranch } = useConfig()
  const { showNotification } = useNotification()

  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const branchMenuRef = useRef<HTMLDivElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setIsBranchMenuOpen(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut '/' to quickly focus global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false)
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Ensure active branch ID is synchronized for API requests
  useEffect(() => {
    if (!localStorage.getItem('pos_active_branch')) {
      localStorage.setItem('pos_active_branch', '1')
    }
  }, [])

  const handleBranchSelect = (branch: BranchOption) => {
    updateBranch(branch.name)
    const branchMap: Record<string, string> = {
      main: '1',
      north: '2',
      metro: '3',
      airport: '4',
    }
    const branchId = branchMap[branch.id] || branch.id
    localStorage.setItem('pos_active_branch', branchId)
    setIsBranchMenuOpen(false)
    showNotification({
      title: 'Branch Location Updated',
      message: `Active POS terminal set to "${branch.name}".`,
      type: 'info',
    })
  }

  // Filter search results
  const filteredResults = searchQuery.trim()
    ? SEARCHABLE_ITEMS.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.detail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5 transition-all">
      {/* Top Row: Business / Store Identity + Branch Selector (Left) & Current Date Selector (Right) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Business Name & Branch Selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDF2F4] text-[#D45060] flex items-center justify-center shrink-0 border border-[#F7B5BD]/60 shadow-2xs">
            <Store className="w-5 h-5 text-[#D45060]" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
                {client.clientName}
              </h1>

              {/* Branch Selector Dropdown */}
              <div ref={branchMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                  aria-label="Select store branch"
                  title="Switch Branch Location"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#D45060]" />
                  <span>{client.branchName}</span>
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 text-slate-400 transition-transform duration-200',
                      isBranchMenuOpen && 'rotate-180'
                    )}
                  />
                </button>

                {isBranchMenuOpen && (
                  <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white text-slate-800 shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-1.5 border-b border-slate-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Store Locations &amp; Branches
                      </p>
                      <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">{client.address}</p>
                    </div>

                    <div className="py-1 max-h-56 overflow-y-auto">
                      {AVAILABLE_BRANCHES.map((b) => {
                        const isSelected = client.branchName === b.name
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleBranchSelect(b)}
                            className={cn(
                              'w-full flex items-center justify-between px-3.5 py-2 text-left text-xs sm:text-[13px] hover:bg-slate-50 transition-colors cursor-pointer',
                              isSelected
                                ? 'bg-[#FDF2F4] text-[#D45060] font-semibold'
                                : 'text-slate-700'
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate font-medium">{b.name}</p>
                              <p className="text-[11px] text-slate-400 font-normal truncate">
                                {b.location}
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#D45060] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
              Welcome back! Here's what's happening with your store today.
            </p>
          </div>
        </div>

        {/* Right: Current Date Selector */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <DatePicker value={selectedDate} onChange={onDateChange} />
        </div>
      </div>

      {/* Bottom Row: Prominent Global Search Field */}
      <div ref={searchContainerRef} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4.5 h-4.5 text-slate-400 pointer-events-none transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Global Search: Find products, orders, customers, barcodes, or invoices... (Press '/' to focus)"
            className="w-full pl-10.5 pr-20 py-2.5 sm:py-3 text-[13.5px] sm:text-sm font-medium bg-slate-50/90 hover:bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:bg-white focus:border-[#D45060] focus:ring-3 focus:ring-[#D45060]/15 transition-all outline-none"
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  searchInputRef.current?.focus()
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Clear Search"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Interactive Search Results Dropdown Panel */}
        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl bg-white text-slate-800 shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 max-h-80 overflow-y-auto">
            <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Matching Results ({filteredResults.length})
              </span>
              <span className="text-[11px] text-slate-400">Press Esc to dismiss</span>
            </div>

            {filteredResults.length > 0 ? (
              <div className="py-1 divide-y divide-slate-50">
                {filteredResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => {
                      showNotification({
                        title: 'Search Selected',
                        message: `Opened "${item.title}".`,
                        type: 'info',
                      })
                      setIsSearchFocused(false)
                      if (item.type === 'customer') {
                        navigate('/customers')
                      } else if (item.type === 'supplier') {
                        navigate('/suppliers')
                      } else if (item.type === 'product') {
                        navigate('/products')
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-[#FDF2F4] group-hover:text-[#D45060] transition-colors">
                        {item.type === 'product' && <Package className="w-3.5 h-3.5" />}
                        {item.type === 'order' && <Receipt className="w-3.5 h-3.5" />}
                        {item.type === 'customer' && <User className="w-3.5 h-3.5" />}
                        {item.type === 'supplier' && <Building2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-[#D45060] transition-colors truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{item.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500">
                <p className="text-xs sm:text-[13px]">No matches found for "{searchQuery}"</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try searching by product name, SKU barcode, customer phone, or order ID
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardHeader

