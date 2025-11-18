import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocationCreateForm } from '@/components/locations/location-create-form'

export default async function NewLocationPage() {
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

  // HQ Admin and Branch Manager can create locations
  if (userData?.role !== 'HQ_Admin' && userData?.role !== 'Branch_Manager') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {userData?.role === 'Branch_Manager' ? 'Add New Sub-Branch' : 'Add New Location'}
        </h1>
        <p className="text-gray-500 mt-2">
          {userData?.role === 'Branch_Manager'
            ? 'Create a new sub-branch under your branch'
            : 'Create a new headquarters, branch, or sub-branch location'}
        </p>
      </div>

      <LocationCreateForm userRole={userData?.role} userLocationId={userData?.location_id} />
    </div>
  )
}
