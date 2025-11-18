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
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  // Only HQ Admin and Branch Manager can access
  if (userData?.role !== 'HQ_Admin' && userData?.role !== 'Branch_Manager') {
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

  // Branch Manager can only edit their own branch or sub-branches under it
  if (userData?.role === 'Branch_Manager') {
    const isOwnBranch = location.id === userData.location_id
    const isSubBranch = location.parent_id === userData.location_id && location.location_type === 'SubBranch'

    if (!isOwnBranch && !isSubBranch) {
      redirect('/dashboard')
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Location</h1>
      <LocationForm location={location} />
    </div>
  )
}
