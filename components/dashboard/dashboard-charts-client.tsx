'use client'

import { useState } from 'react'
import { DashboardFilters, PeriodType } from './dashboard-filters'
import { BranchSalesChart } from './charts/branch-sales-chart'
import { SalesTrendChart } from './charts/sales-trend-chart'
import { ProductDistributionChart } from './charts/product-distribution-chart'
import { ProfitBreakdownChart } from './charts/profit-breakdown-chart'
import { TopProductsTable } from './charts/top-products-table'
import {
  BranchSalesData,
  SalesTrendData,
  ProductSalesData,
  BranchProfitBreakdown,
  TopProduct
} from '@/lib/dashboard-data'

interface DashboardChartsClientProps {
  branchSalesData: BranchSalesData[]
  salesTrendData: SalesTrendData[]
  productSalesData: ProductSalesData[]
  profitBreakdownData: BranchProfitBreakdown[]
  topProductsData: TopProduct[]
  userRole: string
}

export function DashboardChartsClient({
  branchSalesData,
  salesTrendData,
  productSalesData,
  profitBreakdownData,
  topProductsData,
  userRole
}: DashboardChartsClientProps) {
  const [period, setPeriod] = useState<PeriodType>('week')

  // Map period to chart period type
  const chartPeriod = period === 'week' ? 'weekly' : period === 'month' ? 'monthly' : 'monthly'

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <DashboardFilters period={period} onPeriodChange={setPeriod} />

      {/* Charts Grid - First Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {userRole === 'HQ_Admin' && (
          <BranchSalesChart data={branchSalesData} />
        )}
        <SalesTrendChart data={salesTrendData} period={chartPeriod} />
      </div>

      {/* Charts Grid - Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <ProductDistributionChart data={productSalesData} />
        {userRole === 'HQ_Admin' && (
          <ProfitBreakdownChart data={profitBreakdownData} />
        )}
      </div>

      {/* Top Products Table - Full Width */}
      <TopProductsTable data={topProductsData} />
    </div>
  )
}
