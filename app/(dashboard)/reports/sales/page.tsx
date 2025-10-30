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

export default async function SalesReportPage() {
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

  // Get sales data (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let salesQuery = supabase
    .from('sales')
    .select(`
      *,
      product:products(sku, name, category),
      location:locations(name, currency)
    `)
    .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('sale_date', { ascending: false })

  if (profile?.role === 'Branch_Manager') {
    salesQuery = salesQuery.eq('location_id', profile.location_id)
  }

  const { data: sales } = await salesQuery

  // Calculate totals by currency
  const totalsByCurrency = (sales || []).reduce((acc, sale) => {
    const currency = sale.currency
    if (!acc[currency]) {
      acc[currency] = 0
    }
    acc[currency] += parseFloat(sale.total_amount)
    return acc
  }, {} as Record<string, number>)

  // Calculate totals by location
  const totalsByLocation = (sales || []).reduce((acc, sale) => {
    const locationName = sale.location.name
    const currency = sale.currency
    if (!acc[locationName]) {
      acc[locationName] = { total: 0, currency, count: 0 }
    }
    acc[locationName].total += parseFloat(sale.total_amount)
    acc[locationName].count += 1
    return acc
  }, {} as Record<string, { total: number, currency: string, count: number }>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Report</h1>
        <p className="text-muted-foreground">
          View sales performance over the last 30 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(totalsByCurrency).map(([currency, amount]) => (
              <div key={currency} className="text-2xl font-bold">
                {formatCurrency(amount, currency)}
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-1">
              {sales?.length || 0} transactions
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
                {formatCurrency(data.total, data.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.count} transactions
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!sales || sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sales recorded in the last 30 days
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDate(sale.sale_date)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sale.product.sku}</div>
                        <div className="text-sm text-muted-foreground">{sale.product.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sale.product.category}</Badge>
                    </TableCell>
                    <TableCell>{sale.location.name}</TableCell>
                    <TableCell className="text-right">{sale.qty}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.unit_price, sale.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total_amount, sale.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
