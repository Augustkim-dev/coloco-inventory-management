import { createClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { ExpiryWarnings } from "@/components/dashboard/expiry-warnings"
import { DashboardChartsClient } from "@/components/dashboard/dashboard-charts-client"
import { getServerTranslations } from "@/lib/i18n/server-translations"
import {
  enrichSalesWithProfits,
  aggregateBranchSales,
  generateSalesTrend,
  aggregateProductSales,
  aggregateProfitBreakdown,
  getTopProducts,
  calculateDashboardStats
} from "@/lib/dashboard-data"
import { fetchLatestExchangeRates } from "@/lib/currency-converter"

// Server component - cannot use useUser hook
// Instead, we get user info from auth and pass it down
export default async function DashboardPage() {
  const t = await getServerTranslations('dashboard')
  const supabase = await createClient()

  // Get current user information (auth only, not from users table)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get profile from users table for role and location filtering
  const { data: profile } = await supabase
    .from("users")
    .select("role, location_id")
    .eq("id", user.id)
    .single()

  // Get latest exchange rates
  const exchangeRates = await fetchLatestExchangeRates(supabase)

  // Calculate date ranges
  const today = new Date()
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56) // 8 weeks

  // Get sales data with pricing configs for profit calculation (optimized)
  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      location_id,
      product_id,
      sale_date,
      qty,
      unit_price,
      total_amount,
      currency,
      location:locations(name, currency),
      product:products(sku, name),
      pricing_config:pricing_configs!inner(
        local_cost,
        hq_margin_pct,
        branch_margin_pct
      )
    `)
    .gte('sale_date', eightWeeksAgo.toISOString().split('T')[0])
    .lte('sale_date', today.toISOString().split('T')[0])

  if (profile?.role === 'Branch_Manager') {
    salesQuery = salesQuery.eq('location_id', profile.location_id)
  }

  const { data: rawSalesData } = await salesQuery

  // Get today's sales for stats cards
  const todayStr = today.toISOString().split('T')[0]
  let todaySalesQuery = supabase
    .from('sales')
    .select('total_amount, currency')
    .eq('sale_date', todayStr)

  if (profile?.role === 'Branch_Manager') {
    todaySalesQuery = todaySalesQuery.eq('location_id', profile.location_id)
  }

  const { data: todaySales } = await todaySalesQuery

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
      id,
      product_id,
      location_id,
      batch_no,
      qty_on_hand,
      expiry_date,
      manufactured_date,
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

  // Process sales data
  const salesWithProfits = enrichSalesWithProfits(rawSalesData || [], exchangeRates)

  // Generate chart data
  const branchSalesData = aggregateBranchSales(salesWithProfits)
  const salesTrendData = generateSalesTrend(salesWithProfits, 'weekly')
  const productSalesData = aggregateProductSales(salesWithProfits)
  const profitBreakdownData = aggregateProfitBreakdown(salesWithProfits, exchangeRates)
  const topProductsData = getTopProducts(salesWithProfits, 5)

  // Calculate dashboard stats
  const stats = calculateDashboardStats(
    salesWithProfits,
    stockBatches || [],
    exchangeRates
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t.welcome}
        </p>
      </div>

      <DashboardStats
        todaySales={todaySales || []}
        stockBatches={stockBatches || []}
        userRole={profile?.role || 'HQ_Admin'}
        totalHQProfit={stats.totalHQProfit}
        averageMarginRate={stats.averageMarginRate}
      />

      {/* Charts Section - Pass to Client Component for interactivity */}
      <DashboardChartsClient
        branchSalesData={branchSalesData}
        salesTrendData={salesTrendData}
        productSalesData={productSalesData}
        profitBreakdownData={profitBreakdownData}
        topProductsData={topProductsData}
        userRole={profile?.role || 'HQ_Admin'}
      />

      {/* Expiry Warnings */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <ExpiryWarnings expiringStock={expiringStock || []} />
      </div>
    </div>
  )
}
