import { createClient } from '@/lib/supabase/server'
import { LocationForm } from '@/components/locations/location-form'
import { notFound, redirect } from 'next/navigation'

export default async function EditLocationPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  // Check authentication
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

  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  // Fetch location
  const { data: location, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !location) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Location</h1>
      <LocationForm location={location} />
    </div>
  )
}
