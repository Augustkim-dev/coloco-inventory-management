'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Location, Currency } from '@/types'
import { QuickSaleRow } from './quick-sale-row'

interface StockWithProduct {
  product_id: string
  product: {
    id: string
    sku: string
    name: string
    unit: string
  }
  qty_on_hand: number
  location_id: string
}

interface QuickSaleTableProps {
  location: Location
  stocks: StockWithProduct[]
  onSaleComplete: () => void
}

export function QuickSaleTable({
  location,
  stocks,
  onSaleComplete,
}: QuickSaleTableProps) {
  // Sort stocks by product SKU
  const sortedStocks = [...stocks].sort((a, b) =>
    a.product.sku.localeCompare(b.product.sku)
  )

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40%]">Product</TableHead>
            <TableHead className="text-right w-[15%]">Available</TableHead>
            <TableHead className="text-right w-[15%]">Unit Price</TableHead>
            <TableHead className="w-[15%] text-center">Qty</TableHead>
            <TableHead className="w-[15%] text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStocks.map((stock) => (
            <QuickSaleRow
              key={stock.product_id}
              stock={stock}
              location={location}
              onSaleComplete={onSaleComplete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
