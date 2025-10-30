import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function TransactionsReportPage() {
  const supabase = await createClient()

  // Get current user information
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("users")
    .select("role, location_id")
    .eq("id", user?.id)
    .single()

  // Get purchase orders (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(name),
      location:locations(name, currency)
    `)
    .gte('order_date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('order_date', { ascending: false })

  // Get purchase order items for recent orders
  const { data: poItems } = await supabase
    .from('purchase_order_items')
    .select(`
      *,
      product:products(sku, name)
    `)
    .in('po_id', (purchaseOrders || []).map(po => po.id))

  // Calculate PO totals
  const poTotals = (poItems || []).reduce((acc, item) => {
    if (!acc[item.po_id]) {
      acc[item.po_id] = 0
    }
    acc[item.po_id] += item.qty * item.unit_price
    return acc
  }, {} as Record<string, number>)

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'secondary' as const
      case 'Approved':
        return 'default' as const
      case 'Received':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
        <p className="text-muted-foreground">
          View purchase orders and transfer history
        </p>
      </div>

      <Tabs defaultValue="purchase-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="purchase-orders" className="space-y-4">
          {/* Summary Card */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchaseOrders?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 90 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Received Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {purchaseOrders?.filter(po => po.status === 'Received').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {purchaseOrders?.filter(po => po.status !== 'Received').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Draft + Approved
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {!purchaseOrders || purchaseOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No purchase orders found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expected Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.po_number}</TableCell>
                        <TableCell>{formatDate(po.order_date)}</TableCell>
                        <TableCell>{po.supplier.name}</TableCell>
                        <TableCell>{po.location.name}</TableCell>
                        <TableCell className="text-right">
                          {poTotals[po.id]
                            ? formatCurrency(poTotals[po.id], po.location.currency)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(po.status)}>
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(po.expected_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Transfer history feature coming soon. Currently, transfers are tracked through stock batch movements.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                View the Inventory Report for current stock levels by location.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
