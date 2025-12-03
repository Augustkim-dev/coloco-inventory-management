'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Currency, Location } from '@/types'
import { QuickSaleTable } from './quick-sale-table'

interface SaleItem {
  id: string
  sale_date: string
  qty: number
  unit_price: number
  total_amount: number
  currency: Currency
  product: {
    id: string
    sku: string
    name: string
    unit: string
  }
  location: {
    id: string
    name: string
    currency: Currency
  }
}

interface StockItem {
  id: string
  product_id: string
  location_id: string
  qty_on_hand: number
  qty_available: number
  product: {
    id: string
    sku: string
    name: string
    unit: string
  }
}

interface SalesListProps {
  sales: SaleItem[]
  locations?: Location[]
  stocks?: StockItem[]
  userRole?: string
  userLocationId?: string | null
}

export function SalesList({
  sales,
  locations = [],
  stocks = [],
  userRole = '',
  userLocationId,
}: SalesListProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  // Group stocks by location and aggregate by product
  const stocksByLocation = stocks.reduce((acc, stock) => {
    if (!acc[stock.location_id]) {
      acc[stock.location_id] = {}
    }
    const productId = stock.product_id
    if (!acc[stock.location_id][productId]) {
      acc[stock.location_id][productId] = {
        product_id: productId,
        product: stock.product,
        qty_on_hand: 0,
        location_id: stock.location_id,
      }
    }
    acc[stock.location_id][productId].qty_on_hand += stock.qty_on_hand
    return acc
  }, {} as Record<string, Record<string, { product_id: string; product: StockItem['product']; qty_on_hand: number; location_id: string }>>)

  // Convert to array format for each location
  const getStocksForLocation = (locationId: string) => {
    const locationStocks = stocksByLocation[locationId] || {}
    return Object.values(locationStocks)
  }

  // Handle sale completion - trigger refresh
  const handleSaleComplete = () => {
    setRefreshKey(prev => prev + 1)
    // Force page refresh to get updated data
    window.location.reload()
  }

  // Show Quick Sale section only for Branch Manager
  const showQuickSale = userRole === 'Branch_Manager' && locations.length > 0

  // Default open accordion - user's location
  const defaultOpenLocations = userLocationId ? [userLocationId] : []

  return (
    <div className="space-y-8" key={refreshKey}>
      {/* Quick Sale Section - Branch Manager only */}
      {showQuickSale && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Quick Sale</h2>
          <Accordion
            type="multiple"
            defaultValue={defaultOpenLocations}
            className="space-y-2"
          >
            {locations.map((location) => {
              const locationStocks = getStocksForLocation(location.id)
              const productCount = locationStocks.length

              return (
                <AccordionItem
                  key={location.id}
                  value={location.id}
                  className="border rounded-lg"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{location.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {location.location_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {productCount} products in stock
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {productCount === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No stock available at this location
                      </div>
                    ) : (
                      <QuickSaleTable
                        location={location}
                        stocks={locationStocks}
                        onSaleComplete={handleSaleComplete}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </section>
      )}

      {/* Separator between sections */}
      {showQuickSale && sales.length > 0 && <Separator />}

      {/* Recent Sales Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Sales</h2>
        <SalesHistoryTable sales={sales} />
      </section>
    </div>
  )
}

// Sales History Table Component (extracted from original)
function SalesHistoryTable({ sales }: { sales: SaleItem[] }) {
  if (sales.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No sales recorded yet</p>
        <p className="text-sm mt-2">Start by adding your first sale</p>
      </div>
    )
  }

  // Group sales by date
  const groupedSales = sales.reduce((acc, sale) => {
    const date = sale.sale_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(sale)
    return acc
  }, {} as Record<string, SaleItem[]>)

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(groupedSales).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => {
        const salesOnDate = groupedSales[date]
        const totalAmount = salesOnDate.reduce(
          (sum, sale) => sum + parseFloat(sale.total_amount.toString()),
          0
        )
        const currency = salesOnDate[0]?.currency

        return (
          <div key={date} className="space-y-3">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800">
                {formatDate(date)}
              </h3>
              <div className="text-lg font-bold text-gray-900">
                Daily Total: {formatCurrency(totalAmount, currency)}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesOnDate.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.product.sku}</div>
                          <div className="text-sm text-gray-500">
                            {sale.product.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{sale.location.name}</TableCell>
                      <TableCell className="text-right">
                        {sale.qty} {sale.product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.unit_price, sale.currency)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(sale.total_amount, sale.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
