import { createClient } from '@/lib/supabase/server'
import { InventoryView } from '@/components/inventory/inventory-view'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRightLeft } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function InventoryPage() {
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

  // Build query based on user role
  let query = supabase
    .from('stock_batches')
    .select(
      `
      *,
      product:products(sku, name, unit),
      location:locations(name, location_type, currency)
    `
    )
    .gt('qty_on_hand', 0)
    .order('expiry_date', { ascending: true })

  // Branch Manager can only see their own location's inventory
  if (profile.role === 'Branch_Manager') {
    query = query.eq('location_id', profile.location_id)
  }

  const { data: inventory, error } = await query

  if (error) {
    console.error('Error loading inventory:', error)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading inventory</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  // Get all locations for Kanban view, ordered by display_order
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            {profile.role === 'HQ_Admin'
              ? 'View and manage inventory across all locations'
              : 'View inventory for your location'}
          </p>
        </div>
        {profile.role === 'HQ_Admin' && (
          <Link href="/inventory/transfer">
            <Button>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Stock
            </Button>
          </Link>
        )}
      </div>

      <InventoryView
        inventory={inventory || []}
        locations={locations || []}
        userRole={profile.role}
      />
    </div>
  )
}
