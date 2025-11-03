'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TopProduct } from '@/lib/dashboard-data'
import { formatCurrency } from '@/lib/utils'
import { Trophy, TrendingUp } from 'lucide-react'

interface TopProductsTableProps {
  data: TopProduct[]
}

export function TopProductsTable({ data }: TopProductsTableProps) {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">🥇 #{rank}</Badge>
      case 2:
        return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 #{rank}</Badge>
      case 3:
        return <Badge className="bg-amber-600 hover:bg-amber-700">🥉 #{rank}</Badge>
      default:
        return <Badge variant="outline">#{rank}</Badge>
    }
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <CardTitle>Top 5 Best Sellers</CardTitle>
          </div>
          <CardDescription>Highest revenue generating products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No bestseller data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <CardTitle>Top 5 Best Sellers</CardTitle>
        </div>
        <CardDescription>Highest revenue generating products (in KRW)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Sales (KRW)</TableHead>
              <TableHead className="text-right">HQ Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.sku} className="hover:bg-gray-50">
                <TableCell>{getRankBadge(product.rank)}</TableCell>
                <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {product.qty.toLocaleString()}
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-blue-600">
                  {formatCurrency(product.sales, 'KRW')}
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {formatCurrency(product.hqProfit, 'KRW')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
