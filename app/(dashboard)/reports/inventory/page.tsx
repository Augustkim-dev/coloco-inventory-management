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

export default async function InventoryReportPage() {
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

  // Get inventory data
  let inventoryQuery = supabase
    .from('stock_batches')
    .select(`
      *,
      product:products(sku, name, category, unit),
      location:locations(name, currency)
    `)
    .gt('qty_on_hand', 0)
    .order('expiry_date', { ascending: true })

  if (profile?.role === 'Branch_Manager') {
    inventoryQuery = inventoryQuery.eq('location_id', profile.location_id)
  }

  const { data: inventory } = await inventoryQuery

  // Calculate totals by location
  const totalsByLocation = (inventory || []).reduce((acc, batch) => {
    const locationName = batch.location.name
    const currency = batch.location.currency
    const value = batch.qty_on_hand * batch.unit_cost

    if (!acc[locationName]) {
      acc[locationName] = { value: 0, currency, qty: 0, batches: 0 }
    }
    acc[locationName].value += value
    acc[locationName].qty += batch.qty_on_hand
    acc[locationName].batches += 1
    return acc
  }, {} as Record<string, { value: number, currency: string, qty: number, batches: number }>)

  // Calculate total stock value
  const totalValue = (inventory || []).reduce((sum, batch) =>
    sum + (batch.qty_on_hand * batch.unit_cost), 0
  )

  // Get expiry status
  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) return { status: 'Expired', variant: 'destructive' as const }
    if (daysUntilExpiry < 30) return { status: 'Critical', variant: 'destructive' as const }
    if (daysUntilExpiry < 90) return { status: 'Warning', variant: 'warning' as const }
    return { status: 'Good', variant: 'default' as const }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Report</h1>
        <p className="text-muted-foreground">
          Current stock levels by location and batch
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active batches
            </p>
          </CardContent>
        </Card>

        {Object.entries(totalsByLocation).map(([location, data]) => (
          <Card key={location}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{location}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.value, data.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.qty} units • {data.batches} batches
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {!inventory || inventory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No inventory available
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((batch) => {
                  const expiryStatus = getExpiryStatus(batch.expiry_date)
                  const totalValue = batch.qty_on_hand * batch.unit_cost

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{batch.product.sku}</div>
                          <div className="text-sm text-muted-foreground">{batch.product.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{batch.product.category}</Badge>
                      </TableCell>
                      <TableCell>{batch.location.name}</TableCell>
                      <TableCell>{batch.batch_no}</TableCell>
                      <TableCell className="text-right">
                        {batch.qty_on_hand} {batch.product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(batch.unit_cost, batch.location.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(totalValue, batch.location.currency)}
                      </TableCell>
                      <TableCell>{formatDate(batch.expiry_date)}</TableCell>
                      <TableCell>
                        <Badge variant={expiryStatus.variant}>{expiryStatus.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
