import { createClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { ExpiryWarnings } from "@/components/dashboard/expiry-warnings"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { getServerTranslations } from "@/lib/i18n/server-translations"

export default async function DashboardPage() {
  const t = await getServerTranslations('dashboard')
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

  // Get today's sales
  const today = new Date().toISOString().split('T')[0]
  let salesQuery = supabase
    .from('sales')
    .select('total_amount, currency')
    .eq('sale_date', today)

  if (profile?.role === 'Branch_Manager') {
    salesQuery = salesQuery.eq('location_id', profile.location_id)
  }

  const { data: todaySales } = await salesQuery

  // Get stock value
  let stockQuery = supabase
    .from('stock_batches')
    .select(`
      qty_on_hand,
      unit_cost,
      location:locations(name, currency)
    `)
    .eq('quality_status', 'OK')
    .gt('qty_on_hand', 0)

  if (profile?.role === 'Branch_Manager') {
    stockQuery = stockQuery.eq('location_id', profile.location_id)
  }

  const { data: stockBatches } = await stockQuery

  // Get expiry warnings (within 3 months)
  const threeMonthsLater = new Date()
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

  let expiryQuery = supabase
    .from('stock_batches')
    .select(`
      *,
      product:products(sku, name, unit),
      location:locations(name)
    `)
    .eq('quality_status', 'OK')
    .gt('qty_on_hand', 0)
    .lte('expiry_date', threeMonthsLater.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })

  if (profile?.role === 'Branch_Manager') {
    expiryQuery = expiryQuery.eq('location_id', profile.location_id)
  }

  const { data: expiringStock } = await expiryQuery

  // Get recent sales (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let recentSalesQuery = supabase
    .from('sales')
    .select(`
      *,
      product:products(sku, name),
      location:locations(name)
    `)
    .gte('sale_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  if (profile?.role === 'Branch_Manager') {
    recentSalesQuery = recentSalesQuery.eq('location_id', profile.location_id)
  }

  const { data: recentSales } = await recentSalesQuery

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground">
          {t.welcome}
        </p>
      </div>

      <DashboardStats
        todaySales={todaySales || []}
        stockBatches={stockBatches || []}
        userRole={profile?.role || 'HQ_Admin'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiryWarnings expiringStock={expiringStock || []} />
        <RecentSales recentSales={recentSales || []} />
      </div>
    </div>
  )
}
