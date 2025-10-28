import { SupplierForm } from '@/components/suppliers/supplier-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NewSupplierPage() {
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add Supplier</h1>
      <SupplierForm mode="create" />
    </div>
  )
}
