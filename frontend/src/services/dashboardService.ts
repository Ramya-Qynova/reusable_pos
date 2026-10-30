import type {
  KPICardData,
  ProfitLossSummary,
  ProfitTrendPoint,
  SalesOverviewPoint,
  PaymentMethodBreakdown,
  RecentSale,
  LowStockItem,
} from '../types/sales'

/**
 * Dashboard Presentation Data Service
 * 
 * NOTE: For Phase 1, this provides high-fidelity sample presentation data
 * matching the design reference specifications. Real financial calculations
 * and database queries will be processed via the Laravel API in future phases.
 */

export const getKPICardsData = (): KPICardData[] => [
  {
    id: 'todays_sales',
    title: "Today's Sales",
    value: '48,750',
    unitPrefix: '₹',
    changePercentage: 12,
    changeLabel: 'vs yesterday',
    trend: 'up',
    sparklineData: [28, 32, 29, 36, 34, 42, 48],
    colorScheme: 'pink',
  },
  {
    id: 'todays_orders',
    title: "Today's Orders",
    value: 23,
    changePercentage: 5,
    changeLabel: 'vs yesterday',
    trend: 'up',
    sparklineData: [15, 18, 14, 19, 17, 21, 23],
    colorScheme: 'emerald',
  },
  {
    id: 'low_stock_items',
    title: 'Low Stock Items',
    value: 5,
    changePercentage: 2,
    changeLabel: 'critical items',
    trend: 'down',
    sparklineData: [2, 3, 3, 4, 4, 5, 5],
    colorScheme: 'amber',
  },
  {
    id: 'pending_payments',
    title: 'Pending Payments',
    value: '4,750',
    unitPrefix: '₹',
    changePercentage: 1,
    changeLabel: '1 invoice pending',
    trend: 'neutral',
    sparklineData: [1200, 2400, 1800, 3200, 4100, 3900, 4750],
    colorScheme: 'purple',
  },
]

export const getProfitLossSummary = (): ProfitLossSummary => ({
  periodLabel: 'This month (01 Oct 2026 - 29 Oct 2026)',
  netSales: {
    value: 485000,
    changePercentage: 12,
  },
  cogs: {
    value: 310000,
    changePercentage: 8,
  },
  grossProfit: {
    value: 175000,
    changePercentage: 18,
  },
  operatingExpenses: {
    value: 45000,
    changePercentage: 5,
  },
  netProfit: {
    value: 130000,
    changePercentage: 22,
  },
})

export const getProfitTrendData = (): ProfitTrendPoint[] => [
  { date: 'Oct 1', label: 'Oct 01', netSales: 35000, grossProfit: 14000, netProfit: 10000, cogs: 21000 },
  { date: 'Oct 5', label: 'Oct 05', netSales: 42000, grossProfit: 18000, netProfit: 13500, cogs: 24000 },
  { date: 'Oct 10', label: 'Oct 10', netSales: 39000, grossProfit: 16500, netProfit: 12000, cogs: 22500 },
  { date: 'Oct 15', label: 'Oct 15', netSales: 45000, grossProfit: 21000, netProfit: 16000, cogs: 24000 },
  { date: 'Oct 20', label: 'Oct 20', netSales: 54000, grossProfit: 25000, netProfit: 19500, cogs: 29000 },
  { date: 'Oct 25', label: 'Oct 25', netSales: 58000, grossProfit: 28000, netProfit: 22000, cogs: 30000 },
  { date: 'Oct 29', label: 'Oct 29', netSales: 62000, grossProfit: 31000, netProfit: 25000, cogs: 31000 },
]

export const getSalesOverviewData = (): SalesOverviewPoint[] => [
  { date: 'Oct 23', label: 'Oct 23', salesAmount: 18500, orders: 12 },
  { date: 'Oct 24', label: 'Oct 24', salesAmount: 23200, orders: 15 },
  { date: 'Oct 25', label: 'Oct 25', salesAmount: 28900, orders: 17 },
  { date: 'Oct 26', label: 'Oct 26', salesAmount: 32400, orders: 19 },
  { date: 'Oct 27', label: 'Oct 27', salesAmount: 39100, orders: 22 },
  { date: 'Oct 28', label: 'Oct 28', salesAmount: 43500, orders: 20 },
  { date: 'Oct 29', label: 'Oct 29', salesAmount: 48750, orders: 23 },
]

export const getPaymentSummaryData = (): PaymentMethodBreakdown[] => [
  { method: 'Cash', amount: 18250, percentage: 37, color: '#3B82F6' },
  { method: 'UPI', amount: 16800, percentage: 34, color: '#10B981' },
  { method: 'Card', amount: 8400, percentage: 17, color: '#F59E0B' },
  { method: 'Online', amount: 5300, percentage: 11, color: '#8B5CF6' },
]

export const getRecentSalesData = (): RecentSale[] => [
  {
    id: 'sale-1',
    invoiceNumber: 'INV-1001',
    customerName: 'Walk-in Customer',
    customerCategory: 'Vegetables',
    amount: 2450,
    paymentMethod: 'UPI',
    timestamp: '10:42 AM',
    status: 'Completed',
  },
  {
    id: 'sale-2',
    invoiceNumber: 'INV-1002',
    customerName: 'Ramesh Kumar',
    amount: 1280,
    paymentMethod: 'Cash',
    timestamp: '10:35 AM',
    status: 'Completed',
  },
  {
    id: 'sale-3',
    invoiceNumber: 'INV-1003',
    customerName: 'Priya Traders',
    amount: 3620,
    paymentMethod: 'Card',
    timestamp: '10:21 AM',
    status: 'Completed',
  },
  {
    id: 'sale-4',
    invoiceNumber: 'INV-1004',
    customerName: 'Anita Sharma',
    amount: 980,
    paymentMethod: 'UPI',
    timestamp: '09:58 AM',
    status: 'Completed',
  },
  {
    id: 'sale-5',
    invoiceNumber: 'INV-1005',
    customerName: 'Vijay Stores',
    amount: 4750,
    paymentMethod: 'Online',
    timestamp: '09:32 AM',
    status: 'Pending',
  },
]

export const getLowStockAlertsData = (): LowStockItem[] => [
  {
    id: 'stock-1',
    productName: 'Tomato (1kg)',
    category: 'Vegetables',
    currentStock: 5,
    minimumStock: 10,
    unit: 'kg',
    status: 'Low',
    sku: 'VEG-TOM-01',
  },
  {
    id: 'stock-2',
    productName: 'Milk 1L',
    category: 'Dairy',
    currentStock: 3,
    minimumStock: 10,
    unit: 'pcs',
    status: 'Low',
    sku: 'DRY-MLK-01',
  },
  {
    id: 'stock-3',
    productName: 'Rice 5kg',
    category: 'Grocery',
    currentStock: 2,
    minimumStock: 10,
    unit: 'pcs',
    status: 'Low',
    sku: 'GRO-RIC-05',
  },
  {
    id: 'stock-4',
    productName: 'T-shirt (L)',
    category: 'Clothing',
    currentStock: 4,
    minimumStock: 10,
    unit: 'pcs',
    status: 'Low',
    sku: 'APP-TSH-02',
  },
  {
    id: 'stock-5',
    productName: 'Cooking Oil 1L',
    category: 'Grocery',
    currentStock: 6,
    minimumStock: 10,
    unit: 'pcs',
    status: 'Low',
    sku: 'GRO-OIL-01',
  },
]
