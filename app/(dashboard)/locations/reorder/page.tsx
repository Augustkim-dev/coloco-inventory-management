import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocationsReorderClient } from '@/components/locations/locations-reorder-client'

export default async function LocationsReorderPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check user role - only HQ Admin can reorder locations
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'HQ_Admin') {
    redirect('/locations')
  }

  // Fetch locations ordered by current display_order
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, location_type, country_code, address, currency, timezone, display_order, created_at, updated_at')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching locations:', error)
    return <div>Error loading locations</div>
  }

  return (
    <div className="container mx-auto py-8">
      <LocationsReorderClient initialLocations={locations || []} />
    </div>
  )
}
