'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Currency } from '@/types'

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

interface SalesListProps {
  sales: SaleItem[]
}

export function SalesList({ sales }: SalesListProps) {
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
        const totalAmount = salesOnDate.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0)
        const currency = salesOnDate[0]?.currency

        return (
          <div key={date} className="space-y-3">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-100 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800">{formatDate(date)}</h2>
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
                          <div className="text-sm text-gray-500">{sale.product.name}</div>
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
