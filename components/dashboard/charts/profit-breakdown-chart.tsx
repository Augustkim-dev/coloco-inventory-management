'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BranchProfitBreakdown } from '@/lib/dashboard-data'
import { formatCurrency } from '@/lib/utils'

interface ProfitBreakdownChartProps {
  data: BranchProfitBreakdown[]
}

export function ProfitBreakdownChart({ data }: ProfitBreakdownChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.branch}</p>
          <p className="text-sm text-green-600">
            HQ Profit: {formatCurrency(data.hqProfit, 'KRW')}
          </p>
          <p className="text-sm text-blue-600">
            Branch Profit: {formatCurrency(data.branchProfit, 'KRW')}
          </p>
          <p className="text-sm font-semibold text-gray-800 mt-1 pt-1 border-t">
            Total Profit: {formatCurrency(data.totalProfit, 'KRW')}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            HQ Share: {((data.hqProfit / data.totalProfit) * 100).toFixed(1)}%
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
          <CardTitle>Profit Breakdown by Branch</CardTitle>
          <CardDescription>HQ vs Branch profit distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No profit data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Breakdown by Branch</CardTitle>
        <CardDescription>HQ vs Branch profit distribution (in KRW)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            <Bar
              dataKey="hqProfit"
              stackId="a"
              fill="#10b981"
              name="HQ Profit"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="branchProfit"
              stackId="a"
              fill="#3b82f6"
              name="Branch Profit"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
