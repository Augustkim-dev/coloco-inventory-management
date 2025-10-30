import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Package } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PageProps {
  params: {
    id: string
  }
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only HQ Admin can access
  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  // Fetch purchase order with all details
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, name, contact_person, phone, email),
      items:purchase_order_items(
        id,
        qty,
        unit_price,
        total_price,
        product:products(id, sku, name, unit)
      )
    `)
    .eq('id', params.id)
    .single()

  // Debug logging
  console.log('[PO Detail] Requested ID:', params.id)
  console.log('[PO Detail] Error:', error)
  console.log('[PO Detail] Data:', po)

  if (error || !po) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Purchase Order not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            ID: {params.id}
          </p>
          {error && (
            <p className="text-xs text-muted-foreground mb-4">
              Error: {error.message}
            </p>
          )}
          <Link href="/purchase-orders">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'Approved':
        return <Badge variant="default">Approved</Badge>
      case 'Received':
        return <Badge variant="outline">Received</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchase Orders
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{po.po_no}</h1>
            <p className="text-muted-foreground mt-1">Purchase Order Details</p>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(po.status)}
            {po.status === 'Draft' && (
              <Link href={`/purchase-orders/${po.id}/approve`}>
                <Button size="sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </Link>
            )}
            {po.status === 'Approved' && (
              <Link href={`/purchase-orders/${po.id}/receive`}>
                <Button size="sm">
                  <Package className="mr-2 h-4 w-4" />
                  Receive
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">PO Number</p>
              <p className="font-medium">{po.po_no}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-medium">{formatDate(po.order_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-medium">Korea HQ</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{po.currency || 'KRW'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(po.status)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Supplier Name</p>
              <p className="font-medium">{po.supplier?.name || 'N/A'}</p>
            </div>
            {po.supplier?.contact_person && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{po.supplier.contact_person}</p>
              </div>
            )}
            {po.supplier?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{po.supplier.phone}</p>
              </div>
            )}
            {po.supplier?.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{po.supplier.email}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product?.sku || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.product?.name || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.qty.toLocaleString()} {item.product?.unit || ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_price, 'KRW')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_price, 'KRW')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total Amount
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {formatCurrency(po.total_amount, 'KRW')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {po.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{po.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created At</span>
            <span className="font-medium">{formatDate(po.created_at)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated</span>
            <span className="font-medium">{formatDate(po.updated_at)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
