'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ExpiryWarningsProps {
  expiringStock: any[]
}

export function ExpiryWarnings({ expiringStock }: ExpiryWarningsProps) {
  const getWarningLevel = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { level: 'expired', color: 'destructive' as const, text: 'EXPIRED' }
    }
    if (daysUntilExpiry < 30) {
      return { level: 'critical', color: 'destructive' as const, text: `${daysUntilExpiry}d left` }
    }
    if (daysUntilExpiry < 90) {
      return { level: 'warning', color: 'warning' as const, text: `${daysUntilExpiry}d left` }
    }
    return { level: 'info', color: 'secondary' as const, text: `${daysUntilExpiry}d left` }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Expiry Warnings (Next 3 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expiringStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items expiring soon</p>
        ) : (
          <div className="space-y-3">
            {expiringStock.slice(0, 5).map((item) => {
              const warning = getWarningLevel(item.expiry_date)
              return (
                <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="font-medium truncate">{item.product.sku}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {item.location.name} • Batch {item.batch_no}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <Badge variant={warning.color} className="text-xs">
                        {warning.text}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium">
                      {formatDate(item.expiry_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.qty_on_hand} {item.product.unit}
                    </div>
                  </div>
                </div>
              )
            })}
            {expiringStock.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{expiringStock.length - 5} more items expiring soon
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
