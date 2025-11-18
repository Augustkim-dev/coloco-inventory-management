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
    .select('role')
    .eq('id', user.id)
    .single()

  // Only HQ Admin can create locations
  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Location</h1>
        <p className="text-gray-500 mt-2">
          Create a new headquarters, branch, or sub-branch location
        </p>
      </div>

      <LocationCreateForm />
    </div>
  )
}
