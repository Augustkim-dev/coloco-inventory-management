'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Edit } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

interface PricingConfig {
  id: string
  product: {
    sku: string
    name: string
  }
  to_location: {
    name: string
    country_code: string
    currency: string
  }
  purchase_price: number
  transfer_cost: number
  hq_margin_percent: number
  branch_margin_percent: number
  exchange_rate: number
  calculated_price: number
  final_price: number
  currency: string
  updated_at: string
}

export function PricingList({
  pricingConfigs,
}: {
  pricingConfigs: PricingConfig[]
}) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead className="text-right">Purchase Price</TableHead>
            <TableHead className="text-right">Transfer Cost</TableHead>
            <TableHead className="text-center">Margins</TableHead>
            <TableHead className="text-right">Exchange Rate</TableHead>
            <TableHead className="text-right">Final Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pricingConfigs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-gray-500 h-32"
              >
                <div className="flex flex-col items-center justify-center">
                  <p className="text-lg font-medium mb-2">
                    No pricing configurations found
                  </p>
                  <p className="text-sm">
                    Add your first pricing configuration to get started.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            pricingConfigs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{config.product.sku}</div>
                    <div className="text-sm text-gray-500">
                      {config.product.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {config.to_location.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {config.to_location.country_code}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(config.purchase_price, 'KRW')}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(config.transfer_cost, 'KRW')}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Badge variant="secondary" className="text-xs">
                      HQ: {config.hq_margin_percent}%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Branch: {config.branch_margin_percent}%
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <div>1 KRW =</div>
                    <div className="font-medium">
                      {config.exchange_rate} {config.currency}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-bold text-lg">
                    {formatCurrency(
                      config.final_price,
                      config.currency as Currency
                    )}
                  </div>
                  {config.calculated_price !== config.final_price && (
                    <div className="text-xs text-gray-500 line-through">
                      {formatCurrency(
                        config.calculated_price,
                        config.currency as Currency
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/pricing/${config.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
