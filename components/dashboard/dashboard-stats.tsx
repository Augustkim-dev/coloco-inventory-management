'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Package, TrendingUp, Layers } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Currency } from '@/types'

interface DashboardStatsProps {
  todaySales: any[]
  stockBatches: any[]
  userRole: string
}

export function DashboardStats({ todaySales, stockBatches, userRole }: DashboardStatsProps) {
  // Calculate today's sales by currency
  const salesByCurrency = todaySales.reduce((acc, sale) => {
    const currency = sale.currency
    if (!acc[currency]) {
      acc[currency] = 0
    }
    acc[currency] += parseFloat(sale.total_amount)
    return acc
  }, {} as Record<string, number>)

  // Calculate stock value by currency
  const stockValueByCurrency = stockBatches.reduce((acc, batch) => {
    const currency = batch.location.currency
    const value = batch.qty_on_hand * batch.unit_cost
    if (!acc[currency]) {
      acc[currency] = 0
    }
    acc[currency] += value
    return acc
  }, {} as Record<string, number>)

  // Calculate total quantity in stock
  const totalQty = stockBatches.reduce((sum, batch) => sum + batch.qty_on_hand, 0)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {Object.entries(salesByCurrency).length === 0 ? (
            <div className="text-2xl font-bold">No sales today</div>
          ) : (
            (Object.entries(salesByCurrency) as [string, number][]).map(([currency, amount]) => (
              <div key={currency} className="text-2xl font-bold">
                {formatCurrency(amount, currency as Currency)}
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {todaySales.length} {todaySales.length === 1 ? 'transaction' : 'transactions'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {Object.entries(stockValueByCurrency).length === 0 ? (
            <div className="text-2xl font-bold">No stock</div>
          ) : (
            (Object.entries(stockValueByCurrency) as [string, number][]).map(([currency, value]) => (
              <div key={currency} className="text-2xl font-bold">
                {formatCurrency(value, currency as Currency)}
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {totalQty} {totalQty === 1 ? 'unit' : 'units'} in stock
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stockBatches.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Active {stockBatches.length === 1 ? 'batch' : 'batches'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Sales</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todaySales.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Transactions today
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
