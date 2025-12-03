import { createClient } from '@/lib/supabase/server'
import { InventoryView } from '@/components/inventory/inventory-view'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRightLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getServerTranslations } from '@/lib/i18n/server-translations'
import { getDescendants } from '@/lib/hierarchy-utils'

export default async function InventoryPage() {
  const t = await getServerTranslations('inventory')
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile to check role and location
  const { data: profile } = await supabase
    .from('users')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get all locations first (needed for hierarchy calculation and Kanban view)
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('display_order', { ascending: true })

  // Build query based on user role (optimized: select only needed columns)
  let query = supabase
    .from('stock_batches')
    .select(
      `
      id,
      product_id,
      location_id,
      batch_no,
      qty_on_hand,
      qty_reserved,
      qty_available,
      unit_cost,
      manufactured_date,
      expiry_date,
      quality_status,
      created_at,
      updated_at,
      product:products(sku, name, unit),
      location:locations(name, location_type, currency)
    `
    )
    .gt('qty_on_hand', 0)
    .order('expiry_date', { ascending: true })

  // Branch Manager can see their location + all sub-branches
  if (profile.role === 'Branch_Manager' && profile.location_id && locations) {
    // Get all descendant location IDs (sub-branches)
    const descendants = getDescendants(profile.location_id, locations)
    const descendantIds = descendants.map(loc => loc.id)
    const allLocationIds = [profile.location_id, ...descendantIds]
    query = query.in('location_id', allLocationIds)
  }

  const { data: rawInventory, error } = await query

  if (error) {
    console.error('Error loading inventory:', error)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">{t.messages.loadError}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  // Transform data to match expected type (Supabase returns arrays for joins)
  const inventory = rawInventory?.map((item: any) => ({
    ...item,
    product: Array.isArray(item.product) ? item.product[0] : item.product,
    location: Array.isArray(item.location) ? item.location[0] : item.location,
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-1">
            {profile.role === 'HQ_Admin'
              ? 'View and manage inventory across all locations'
              : 'View inventory for your location'}
          </p>
        </div>
        {(profile.role === 'HQ_Admin' || profile.role === 'Branch_Manager') && (
          <Link href="/inventory/transfer">
            <Button>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {t.transfer}
            </Button>
          </Link>
        )}
      </div>

      <InventoryView
        inventory={inventory || []}
        locations={locations || []}
        userRole={profile.role}
        userLocationId={profile.location_id}
      />
    </div>
  )
}
