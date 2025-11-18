import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocationsViewClient } from '@/components/locations/locations-view-client'
import { getServerTranslations } from '@/lib/i18n/server-translations'

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
          <a
            href="/locations/reorder"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {t.reorderLocations}
          </a>
        )}
      </div>

      <LocationsViewClient locations={locations || []} />
    </div>
  )
}
