import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardPeriodSelector } from "@/components/dashboard/dashboard-period-selector"
import { DashboardComparisonCards } from "@/components/dashboard/dashboard-comparison-cards"
import { LocationSalesTable } from "@/components/dashboard/location-sales-table"
import { ExpiryWarnings } from "@/components/dashboard/expiry-warnings"
import { getServerTranslations } from "@/lib/i18n/server-translations"
import {
  enrichSalesForDashboard,
  calculatePeriodComparison,
  aggregateSalesByLocation,
} from "@/lib/dashboard-data"
import { fetchLatestExchangeRates } from "@/lib/currency-converter"
import { getDescendants } from "@/lib/hierarchy-utils"
import {
  parsePeriodFromParams,
  calculatePeriodRanges,
  formatDateForAPI,
} from "@/lib/date-utils"
import { Location, UserRole } from "@/types"

interface DashboardPageProps {
  searchParams: Promise<{
    period?: string
    from?: string
    to?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const t = await getServerTranslations('dashboard')
  const supabase = await createClient()
  const params = await searchParams

  // Get current user information
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

  const userRole = (profile?.role || 'HQ_Admin') as UserRole

  // Get all locations for hierarchy operations
  const { data: allLocations } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  const locations = (allLocations || []) as Location[]

  // Get latest exchange rates
  const exchangeRates = await fetchLatestExchangeRates(supabase)

  // Parse period from URL params
  const { period, from, to } = parsePeriodFromParams(params)

  // Calculate date ranges for current and previous periods
  const periodRanges = calculatePeriodRanges(period, from, to)

  // Determine location filter for Branch_Manager
  let allowedLocationIds: string[] | null = null
  if (userRole === 'Branch_Manager' && profile?.location_id) {
    const descendants = getDescendants(profile.location_id, locations)
    allowedLocationIds = [profile.location_id, ...descendants.map(loc => loc.id)]
  }

  // Build the base query
  const buildSalesQuery = (fromDate: Date, toDate: Date) => {
    let query = supabase
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
        location:locations(id, name, location_type, parent_id, currency, level),
        product:products(sku, name),
        pricing_config:pricing_configs!inner(
          local_cost,
          hq_margin_pct,
          branch_margin_pct
        )
      `)
      .gte('sale_date', formatDateForAPI(fromDate))
      .lte('sale_date', formatDateForAPI(toDate))

    // Apply location filter for Branch_Manager
    if (allowedLocationIds) {
      query = query.in('location_id', allowedLocationIds)
    }

    return query
  }

  // Fetch current and previous period data in parallel
  const [currentResult, previousResult] = await Promise.all([
    buildSalesQuery(periodRanges.current.from, periodRanges.current.to),
    buildSalesQuery(periodRanges.previous.from, periodRanges.previous.to),
  ])

  const currentSalesRaw = currentResult.data || []
  const previousSalesRaw = previousResult.data || []

  // Enrich sales data with profit calculations
  const currentSales = enrichSalesForDashboard(currentSalesRaw, locations, exchangeRates)
  const previousSales = enrichSalesForDashboard(previousSalesRaw, locations, exchangeRates)

  // Calculate comparison stats
  const comparisonStats = calculatePeriodComparison(currentSales, previousSales)

  // Aggregate sales by location
  const salesByLocation = aggregateSalesByLocation(currentSales, locations, exchangeRates)

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

  if (allowedLocationIds) {
    expiryQuery = expiryQuery.in('location_id', allowedLocationIds)
  }

  const { data: expiringStock } = await expiryQuery

  // Get user's location name for Branch_Manager title
  let userLocationName = ''
  if (userRole === 'Branch_Manager' && profile?.location_id) {
    const userLocation = locations.find(loc => loc.id === profile.location_id)
    userLocationName = userLocation?.name || ''
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t.title}
            {userLocationName && (
              <span className="text-muted-foreground ml-2">- {userLocationName}</span>
            )}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t.welcome}
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <DashboardPeriodSelector
        currentPeriod={period}
        dateRange={{
          from: periodRanges.current.from,
          to: periodRanges.current.to,
        }}
      />

      {/* Comparison Stats Cards */}
      <DashboardComparisonCards
        stats={comparisonStats}
        comparisonLabel={periodRanges.comparisonLabel}
        userRole={userRole}
      />

      {/* Location Sales Table */}
      <LocationSalesTable
        salesByLocation={salesByLocation}
        sales={currentSales}
        exchangeRates={exchangeRates}
        userRole={userRole}
      />

      {/* Expiry Warnings */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <ExpiryWarnings expiringStock={expiringStock || []} />
      </div>
    </div>
  )
}
