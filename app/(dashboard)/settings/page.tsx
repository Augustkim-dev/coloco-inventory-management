import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/settings/settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get current user profile
  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  // Get user's location name if assigned
  let locationName: string | null = null
  if (currentUser.location_id) {
    const { data: location } = await supabase
      .from('locations')
      .select('name')
      .eq('id', currentUser.location_id)
      .single()
    locationName = location?.name || null
  }

  // Fetch all users for admin (only if HQ_Admin)
  let allUsers: any[] = []
  let locations: any[] = []

  if (currentUser.role === 'HQ_Admin') {
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    allUsers = users || []

    const { data: locs } = await supabase
      .from('locations')
      .select('id, name, location_type, level, path')
      .order('display_order', { ascending: true })
    locations = locs || []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-2">Manage your account and system settings</p>
      </div>

      <SettingsClient
        currentUser={currentUser}
        currentUserLocationName={locationName}
        allUsers={allUsers}
        locations={locations}
      />
    </div>
  )
}
