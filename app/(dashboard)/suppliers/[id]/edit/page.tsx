import { createClient } from '@/lib/supabase/server'
import { SupplierForm } from '@/components/suppliers/supplier-form'
import { notFound, redirect } from 'next/navigation'

export default async function EditSupplierPage({
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

  // Fetch supplier
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !supplier) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Supplier</h1>
      <SupplierForm supplier={supplier} mode="edit" />
    </div>
  )
}
