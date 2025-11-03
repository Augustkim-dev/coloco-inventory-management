'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ProductSalesData } from '@/lib/dashboard-data'
import { formatCurrency } from '@/lib/utils'

interface ProductDistributionChartProps {
  data: ProductSalesData[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

export function ProductDistributionChart({ data }: ProductDistributionChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.name}</p>
          <p className="text-sm text-gray-600">SKU: {data.sku}</p>
          <p className="text-sm text-blue-600">
            Sales: {formatCurrency(data.value, 'KRW')}
          </p>
          <p className="text-sm text-gray-600">
            Quantity: {data.qty.toLocaleString()} units
          </p>
          <p className="text-sm font-semibold text-green-600">
            {data.percentage}% of total
          </p>
        </div>
      )
    }
    return null
  }

  // Custom label
  const renderLabel = ({ name, percentage }: any) => {
    return `${name}: ${percentage}%`
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Sales Distribution</CardTitle>
          <CardDescription>Top selling products by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No product data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Sales Distribution</CardTitle>
        <CardDescription>Top 5 products by revenue (in KRW)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data as any}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => {
                const item = data.find(d => d.name === entry.payload.name)
                return `${value} (${item?.percentage}%)`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
