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
    .select('role')
    .eq('id', user.id)
    .single()

  // Only HQ Admin can access
  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  // Fetch all locations with hierarchy fields, ordered by path
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .order('path', { ascending: true })

  if (error) {
    return <div>{t.messages.loadError}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-gray-500 mt-2">
            Manage headquarters, branches, and sub-branches
          </p>
        </div>
        {userData?.role === 'HQ_Admin' && (
          <div className="flex gap-2">
            <Link
              href="/locations/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Link>
            <Link
              href="/locations/reorder"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t.reorderLocations}
            </Link>
          </div>
        )}
      </div>

      <LocationsViewClient locations={locations || []} />
    </div>
  )
}
