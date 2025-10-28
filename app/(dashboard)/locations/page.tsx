import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocationsList } from '@/components/locations/locations-list'

export default async function LocationsPage() {
  const supabase = await createClient()

  // Check user authentication and permissions
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only HQ Admin can access
  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  // Fetch locations
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .order('location_type', { ascending: false }) // HQ first

  if (error) {
    return <div>Error loading locations: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Locations</h1>
        <p className="text-gray-500 mt-2">
          Manage headquarters and branch information
        </p>
      </div>

      <LocationsList locations={locations || []} />
    </div>
  )
}
