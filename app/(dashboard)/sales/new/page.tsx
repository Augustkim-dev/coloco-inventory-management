import { createClient } from '@/lib/supabase/server'
import { SaleForm } from '@/components/sales/sale-form'
import { redirect } from 'next/navigation'
import { Currency, Location } from '@/types'
import { getServerTranslations, getCommonTranslations } from '@/lib/i18n/server-translations'
import { getDescendants } from '@/lib/hierarchy-utils'

export default async function NewSalePage() {
  const t = await getServerTranslations('sales')
  const tCommon = await getCommonTranslations()
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select(`
      role,
      location_id,
      location:locations(id, name, currency)
    `)
    .eq('id', user.id)
    .single()

  // Only Branch Manager can access this page
  if (profile?.role !== 'Branch_Manager') {
    redirect('/dashboard')
  }

  if (!profile.location || Array.isArray(profile.location)) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          Error: No location assigned to your account. Please contact HQ Admin.
        </div>
      </div>
    )
  }

  // Type assertion for location
  const userLocation = profile.location as { id: string; name: string; currency: Currency }

  // Fetch all locations to find Sub-Branches
  const { data: allLocations } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // Get accessible locations (own + Sub-Branches)
  let accessibleLocations: Array<{ id: string; name: string; currency: Currency }> = [userLocation]

  if (allLocations && profile.location_id) {
    const descendants = getDescendants(profile.location_id, allLocations as Location[])
    const subBranchLocations = descendants.map(loc => ({
      id: loc.id,
      name: loc.name,
      currency: loc.currency as Currency,
    }))
    accessibleLocations = [userLocation, ...subBranchLocations]
  }

  // Fetch products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name, unit')
    .order('sku')

  if (productsError) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          {tCommon.messages.loadError}: {productsError.message}
        </div>
      </div>
    )
  }

  // Fetch stock data for all accessible locations
  const locationIds = accessibleLocations.map(loc => loc.id)
  const { data: stockData } = await supabase
    .from('stock_batches')
    .select('product_id, location_id, qty_on_hand')
    .in('location_id', locationIds)
    .eq('quality_status', 'OK')
    .gt('qty_on_hand', 0)

  // Group stock by location and product
  const stockByLocationProduct: Record<string, Record<string, number>> = {}
  locationIds.forEach(locId => {
    stockByLocationProduct[locId] = {}
  })

  stockData?.forEach(stock => {
    if (!stockByLocationProduct[stock.location_id]) {
      stockByLocationProduct[stock.location_id] = {}
    }
    if (!stockByLocationProduct[stock.location_id][stock.product_id]) {
      stockByLocationProduct[stock.location_id][stock.product_id] = 0
    }
    stockByLocationProduct[stock.location_id][stock.product_id] += stock.qty_on_hand
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.addSale}</h1>
        <p className="text-gray-600 mt-1">Record a new sale for your location</p>
      </div>
      <SaleForm
        locations={accessibleLocations}
        defaultLocationId={userLocation.id}
        products={products || []}
        stockByLocationProduct={stockByLocationProduct}
      />
    </div>
  )
}
