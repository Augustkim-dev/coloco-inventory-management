import { createClient } from '@/lib/supabase/server'
import { SalesList } from '@/components/sales/sales-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getServerTranslations } from '@/lib/i18n/server-translations'
import { getDescendants } from '@/lib/hierarchy-utils'

export default async function SalesPage() {
  const t = await getServerTranslations('sales')
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  // Get all locations (needed for hierarchy calculation)
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // Build query for sales
  let query = supabase
    .from('sales')
    .select(`
      *,
      product:products(id, sku, name, unit),
      location:locations(id, name, currency)
    `)
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  // Branch Manager can see their location + all sub-branches
  if (profile?.role === 'Branch_Manager') {
    if (!profile.location_id) {
      return (
        <div className="p-6">
          <div className="text-red-600">
            Error: No location assigned to your account. Please contact HQ Admin.
          </div>
        </div>
      )
    }

    if (locations) {
      const descendants = getDescendants(profile.location_id, locations)
      const descendantIds = descendants.map(loc => loc.id)
      const allLocationIds = [profile.location_id, ...descendantIds]
      query = query.in('location_id', allLocationIds)
    } else {
      query = query.eq('location_id', profile.location_id)
    }
  }

  const { data: sales, error } = await query

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          {t.messages.loadError}: {error.message}
        </div>
      </div>
    )
  }

  // Get stocks for Quick Sale (Branch Manager only)
  let stocks: any[] = []
  let filteredLocations: any[] = []

  if (profile?.role === 'Branch_Manager' && profile.location_id && locations) {
    const descendants = getDescendants(profile.location_id, locations)
    const descendantIds = descendants.map(loc => loc.id)
    const allLocationIds = [profile.location_id, ...descendantIds]

    // Filter locations for Branch Manager
    filteredLocations = locations.filter(loc => allLocationIds.includes(loc.id))

    // Get stocks with product info for all accessible locations
    const { data: stockData } = await supabase
      .from('stock_batches')
      .select(`
        id,
        product_id,
        location_id,
        qty_on_hand,
        qty_available,
        product:products(id, sku, name, unit)
      `)
      .in('location_id', allLocationIds)
      .gt('qty_on_hand', 0)
      .eq('quality_status', 'OK')
      .order('product_id')

    stocks = stockData || []
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {profile?.role === 'Branch_Manager'
              ? 'View and manage sales for your locations'
              : 'View all sales across locations'}
          </p>
        </div>
        {profile?.role === 'Branch_Manager' && (
          <Link href="/sales/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t.addSale}
            </Button>
          </Link>
        )}
      </div>

      <SalesList
        sales={sales || []}
        locations={filteredLocations}
        stocks={stocks}
        userRole={profile?.role || ''}
        userLocationId={profile?.location_id}
      />
    </div>
  )
}
