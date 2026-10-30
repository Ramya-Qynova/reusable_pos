import React, { useState } from 'react'
import { DashboardHeader } from '../components/layout/DashboardHeader'
import { QuickActionsSection } from '../modules/dashboard/components/QuickActionsSection'
import { KPICardsSection } from '../modules/dashboard/components/KPICardsSection'
import { SalesOverviewChart } from '../modules/dashboard/components/SalesOverviewChart'
import { PaymentSummaryChart } from '../modules/dashboard/components/PaymentSummaryChart'
import { RecentSalesTable } from '../modules/dashboard/components/RecentSalesTable'
import { LowStockAlertsTable } from '../modules/dashboard/components/LowStockAlertsTable'
import { OfflineStatusPanel } from '../modules/dashboard/components/OfflineStatusPanel'

import {
  getKPICardsData,
  getSalesOverviewData,
  getPaymentSummaryData,
  getRecentSalesData,
  getLowStockAlertsData,
} from '../services/dashboardService'

export const DashboardPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState('today')

  const kpis = getKPICardsData()
  const salesOverview = getSalesOverviewData()
  const paymentSummary = getPaymentSummaryData()
  const recentSales = getRecentSalesData()
  const lowStock = getLowStockAlertsData()

  return (
    <div className="space-y-3 sm:space-y-3.5 animate-in fade-in duration-200">
      {/* 1. Dashboard Header (Business Name, Branch Selector, Prominent Global Search, Date Picker) */}
      <DashboardHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* 2. Quick Actions (Immediately below dashboard header & before KPI summary cards) */}
      <QuickActionsSection />

      {/* 3. Today's Summary KPI Cards */}
      <KPICardsSection cards={kpis} title="Today's Summary" />

      {/* 4. Business Overview (Sales Overview and Payment Summary) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-3.5">
        {/* Left: Sales Overview Chart (7 columns on desktop) */}
        <div className="xl:col-span-7">
          <SalesOverviewChart data={salesOverview} />
        </div>

        {/* Right: Payment Summary Donut Chart (5 columns on desktop) */}
        <div className="xl:col-span-5">
          <PaymentSummaryChart data={paymentSummary} totalSales={48750} />
        </div>
      </div>

      {/* 5. Operational Information (Recent Sales and Low Stock Alerts) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-3.5">
        {/* Left: Recent Sales Table (7 columns on desktop) */}
        <div className="xl:col-span-7">
          <RecentSalesTable sales={recentSales} />
        </div>

        {/* Right: Low Stock Alerts Table (5 columns on desktop) */}
        <div className="xl:col-span-5">
          <LowStockAlertsTable items={lowStock} />
        </div>
      </div>

      {/* 6. Offline / Sync Status */}
      <OfflineStatusPanel />
    </div>
  )
}

export default DashboardPage
