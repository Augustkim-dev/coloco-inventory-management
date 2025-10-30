'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { StockBatch } from '@/types'

interface InventoryListProps {
  inventory: Array<
    StockBatch & {
      product: {
        sku: string
        name: string
        unit: string
      }
      location: {
        name: string
        location_type: string
        currency: string
      }
    }
  >
}

export function InventoryList({ inventory }: InventoryListProps) {
  const getExpiryWarning = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>
    } else if (daysUntilExpiry < 30) {
      return <Badge variant="destructive">Expires in {daysUntilExpiry} days</Badge>
    } else if (daysUntilExpiry < 90) {
      return <Badge variant="warning">Expires in {daysUntilExpiry} days</Badge>
    } else if (daysUntilExpiry < 180) {
      return <Badge variant="secondary">Expires in {daysUntilExpiry} days</Badge>
    }
    return <Badge variant="outline">Good</Badge>
  }

  const getQualityBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge variant="outline">OK</Badge>
      case 'Damaged':
        return <Badge variant="destructive">Damaged</Badge>
      case 'Quarantine':
        return <Badge variant="warning">Quarantine</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Group inventory by location
  const groupedInventory = inventory.reduce<Record<string, typeof inventory>>((acc, item) => {
    const locationName = item.location.name
    if (!acc[locationName]) {
      acc[locationName] = []
    }
    acc[locationName].push(item)
    return acc
  }, {})

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No inventory found
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedInventory).map(([locationName, items]) => (
        <div key={locationName} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{locationName}</h2>
            <span className="text-sm text-muted-foreground">
              {items.length} batch{items.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Manufactured</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product.sku}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.product.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{item.batch_no}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div className="font-medium">
                          {item.qty_on_hand.toLocaleString()} {item.product.unit}
                        </div>
                        {item.qty_reserved > 0 && (
                          <div className="text-xs text-muted-foreground">
                            ({item.qty_reserved} reserved)
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(item.manufactured_date)}</TableCell>
                    <TableCell>{formatDate(item.expiry_date)}</TableCell>
                    <TableCell>{getQualityBadge(item.quality_status)}</TableCell>
                    <TableCell>{getExpiryWarning(item.expiry_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
