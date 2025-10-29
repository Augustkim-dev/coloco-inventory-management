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
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Eye, CheckCircle, Package } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Currency } from '@/types'

interface PurchaseOrder {
  id: string
  po_no: string
  order_date: string
  status: 'Draft' | 'Approved' | 'Received'
  total_amount: number
  currency: Currency
  supplier?: {
    name: string
  }
}

interface POListProps {
  purchaseOrders: PurchaseOrder[]
}

export function POList({ purchaseOrders }: POListProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      Draft: 'secondary',
      Approved: 'default',
      Received: 'outline',
    }

    const colors: Record<string, string> = {
      Draft: 'text-gray-600',
      Approved: 'text-blue-600',
      Received: 'text-green-600',
    }

    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO No.</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                No purchase orders found. Create your first PO to get started.
              </TableCell>
            </TableRow>
          ) : (
            purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.po_no}</TableCell>
                <TableCell>{po.supplier?.name}</TableCell>
                <TableCell>{formatDate(po.order_date)}</TableCell>
                <TableCell>{getStatusBadge(po.status)}</TableCell>
                <TableCell>{formatCurrency(po.total_amount, po.currency)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/purchase-orders/${po.id}`}>
                      <Button variant="ghost" size="sm" title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {po.status === 'Draft' && (
                      <Link href={`/purchase-orders/${po.id}/approve`}>
                        <Button variant="ghost" size="sm" title="Approve PO">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      </Link>
                    )}
                    {po.status === 'Approved' && (
                      <Link href={`/purchase-orders/${po.id}/receive`}>
                        <Button variant="ghost" size="sm" title="Receive PO">
                          <Package className="h-4 w-4 text-blue-600" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
