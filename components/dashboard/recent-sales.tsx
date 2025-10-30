'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatCurrency } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface RecentSalesProps {
  recentSales: any[]
}

export function RecentSales({ recentSales }: RecentSalesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Recent Sales (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentSales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent sales</p>
        ) : (
          <div className="space-y-3">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="font-medium truncate">{sale.product.sku}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {sale.location.name} • {formatDate(sale.sale_date)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-lg">
                    {formatCurrency(sale.total_amount, sale.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sale.qty} {sale.qty === 1 ? 'unit' : 'units'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
