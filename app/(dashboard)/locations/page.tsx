import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocationsViewClient } from '@/components/locations/locations-view-client'
import { getServerTranslations } from '@/lib/i18n/server-translations'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function LocationsPage() {
  const t = await getServerTranslations('locations')
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
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  // HQ Admin and Branch Manager can access
  if (userData?.role !== 'HQ_Admin' && userData?.role !== 'Branch_Manager') {
    redirect('/dashboard')
  }

  // Fetch locations based on user role
  let locationsQuery = supabase
    .from('locations')
    .select('*')
    .order('path', { ascending: true })

  // Branch Manager can only see their branch and its sub-branches
  if (userData?.role === 'Branch_Manager' && userData?.location_id) {
    // Get the branch location and all its descendants
    const { data: branchLocation } = await supabase
      .from('locations')
      .select('id')
      .eq('id', userData.location_id)
      .single()

    if (branchLocation) {
      // Fetch: 1) their branch, 2) all sub-branches under their branch
      locationsQuery = locationsQuery.or(
        `id.eq.${userData.location_id},parent_id.eq.${userData.location_id}`
      )
    }
  }

  const { data: locations, error } = await locationsQuery

  if (error) {
    return <div>{t.messages.loadError}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-gray-500 mt-2">
            {userData?.role === 'HQ_Admin'
              ? 'Manage headquarters, branches, and sub-branches'
              : 'Manage your branch and sub-branches'}
          </p>
        </div>
        <div className="flex gap-2">
          {(userData?.role === 'HQ_Admin' || userData?.role === 'Branch_Manager') && (
            <Link
              href="/locations/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              {userData?.role === 'Branch_Manager' ? 'Add Sub-Branch' : 'Add Location'}
            </Link>
          )}
          {userData?.role === 'HQ_Admin' && (
            <Link
              href="/locations/reorder"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t.reorderLocations}
            </Link>
          )}
        </div>
      </div>

      <LocationsViewClient
        locations={locations || []}
        userRole={userData?.role || 'Branch_Manager'}
        userLocationId={userData?.location_id || null}
      />
    </div>
  )
}
