'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SalesTrendData } from '@/lib/dashboard-data'
import { formatCurrency } from '@/lib/utils'

interface SalesTrendChartProps {
  data: SalesTrendData[]
  period: 'daily' | 'weekly' | 'monthly'
}

export function SalesTrendChart({ data, period }: SalesTrendChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.date}</p>
          <p className="text-sm text-blue-600">
            Total Sales: {formatCurrency(data.totalSales, 'KRW')}
          </p>
          <p className="text-sm text-green-600">
            HQ Profit: {formatCurrency(data.hqProfit, 'KRW')}
          </p>
          {data.vietnamSales !== undefined && (
            <p className="text-sm text-amber-600">
              Vietnam: {formatCurrency(data.vietnamSales, 'KRW')}
            </p>
          )}
          {data.chinaSales !== undefined && (
            <p className="text-sm text-red-600">
              China: {formatCurrency(data.chinaSales, 'KRW')}
            </p>
          )}
          {data.koreaHQSales !== undefined && (
            <p className="text-sm text-purple-600">
              Korea HQ: {formatCurrency(data.koreaHQSales, 'KRW')}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Format date for display
  const formatXAxis = (value: string) => {
    if (period === 'weekly') {
      // "2024-W03" → "W03"
      return value.split('-')[1]
    } else if (period === 'monthly') {
      // "2024-01" → "Jan"
      const [year, month] = value.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return monthNames[parseInt(month) - 1]
    }
    // daily: "2024-01-15" → "01/15"
    return value.substring(5)
  }

  const periodLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
          <CardDescription>{periodLabels[period]} sales trend over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No trend data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Trend</CardTitle>
        <CardDescription>{periodLabels[period]} sales trend over time (in KRW)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={formatXAxis}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="totalSales"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Sales"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="hqProfit"
              stroke="#10b981"
              strokeWidth={2}
              name="HQ Profit"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            {data.some(d => d.vietnamSales !== undefined) && (
              <Line
                type="monotone"
                dataKey="vietnamSales"
                stroke="#f59e0b"
                strokeWidth={1.5}
                name="Vietnam"
                dot={{ r: 3 }}
                strokeDasharray="5 5"
              />
            )}
            {data.some(d => d.chinaSales !== undefined) && (
              <Line
                type="monotone"
                dataKey="chinaSales"
                stroke="#ef4444"
                strokeWidth={1.5}
                name="China"
                dot={{ r: 3 }}
                strokeDasharray="5 5"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
