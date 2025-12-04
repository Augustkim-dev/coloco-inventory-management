'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PeriodComparisonStats, UserRole } from '@/types'
import { cn } from '@/lib/utils'

interface DashboardComparisonCardsProps {
  stats: PeriodComparisonStats
  comparisonLabel: string
  userRole: UserRole
}

interface StatCardProps {
  title: string
  value: number
  previousValue: number
  changePercent: number
  comparisonLabel: string
  format: 'currency' | 'number'
  icon: React.ReactNode
  colorClass?: string
  showChange?: boolean
}

function StatCard({
  title,
  value,
  previousValue,
  changePercent,
  comparisonLabel,
  format,
  icon,
  colorClass = 'text-foreground',
  showChange = true,
}: StatCardProps) {
  const isPositive = changePercent >= 0
  const displayValue = format === 'currency'
    ? formatCurrency(value, 'KRW')
    : value.toLocaleString()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', colorClass)}>
          {displayValue}
        </div>
        {showChange && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {comparisonLabel}
            </span>
          </div>
        )}
        {!showChange && (
          <p className="text-xs text-muted-foreground mt-1">
            {comparisonLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardComparisonCards({
  stats,
  comparisonLabel,
  userRole,
}: DashboardComparisonCardsProps) {
  const isAdmin = userRole === 'HQ_Admin'

  return (
    <div className={cn(
      'grid gap-4',
      isAdmin
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-3'
    )}>
      {/* Total Sales */}
      <StatCard
        title="Total Sales"
        value={stats.current.totalSales}
        previousValue={stats.previous.totalSales}
        changePercent={stats.change.salesPct}
        comparisonLabel={comparisonLabel}
        format="currency"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />

      {/* HQ Profit - Admin Only */}
      {isAdmin && (
        <StatCard
          title="HQ Profit"
          value={stats.current.hqProfit}
          previousValue={stats.previous.hqProfit}
          changePercent={stats.change.hqProfitPct}
          comparisonLabel={comparisonLabel}
          format="currency"
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          colorClass="text-green-600"
        />
      )}

      {/* Branch Profit */}
      <StatCard
        title="Branch Profit"
        value={stats.current.branchProfit}
        previousValue={stats.previous.branchProfit}
        changePercent={stats.change.branchProfitPct}
        comparisonLabel={comparisonLabel}
        format="currency"
        icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
        colorClass="text-blue-600"
      />

      {/* Transactions */}
      <StatCard
        title="Transactions"
        value={stats.current.transactions}
        previousValue={stats.previous.transactions}
        changePercent={stats.change.transactionsPct}
        comparisonLabel={comparisonLabel}
        format="number"
        icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
      />

      {/* Quantity Sold - Show for Admin in expanded view */}
      {isAdmin && (
        <StatCard
          title="Units Sold"
          value={stats.current.qty}
          previousValue={stats.previous.qty}
          changePercent={stats.change.qtyPct}
          comparisonLabel={comparisonLabel}
          format="number"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
      )}
    </div>
  )
}
