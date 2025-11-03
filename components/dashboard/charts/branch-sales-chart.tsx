'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BranchSalesData } from '@/lib/dashboard-data'
import { formatCurrency } from '@/lib/utils'

interface BranchSalesChartProps {
  data: BranchSalesData[]
}

export function BranchSalesChart({ data }: BranchSalesChartProps) {
  // Format data for display
  const chartData = data.map(item => ({
    ...item,
    salesDisplay: item.sales, // Already in KRW
    profitDisplay: item.profit, // Already in KRW
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.branch}</p>
          <p className="text-sm text-blue-600">
            Sales: {formatCurrency(data.sales, 'KRW')}
          </p>
          <p className="text-sm text-green-600">
            HQ Profit: {formatCurrency(data.profit, 'KRW')}
          </p>
          <p className="text-sm text-gray-600">
            Quantity: {data.quantity.toLocaleString()} units
          </p>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Branch Sales Overview</CardTitle>
          <CardDescription>Sales and profit comparison by branch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No sales data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch Sales Overview</CardTitle>
        <CardDescription>Sales and HQ profit comparison by branch (in KRW)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="branch"
              tick={{ fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="salesDisplay" fill="#3b82f6" name="Sales (KRW)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profitDisplay" fill="#10b981" name="HQ Profit (KRW)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
