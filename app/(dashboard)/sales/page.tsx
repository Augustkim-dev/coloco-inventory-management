import { createClient } from '@/lib/supabase/server'
import { SalesList } from '@/components/sales/sales-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function SalesPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  // Build query for sales
  let query = supabase
    .from('sales')
    .select(`
      *,
      product:products(id, sku, name, unit),
      location:locations(id, name, currency)
    `)
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  // Branch Manager can only see their location
  if (profile?.role === 'Branch_Manager') {
    if (!profile.location_id) {
      return (
        <div className="p-6">
          <div className="text-red-600">
            Error: No location assigned to your account. Please contact HQ Admin.
          </div>
        </div>
      )
    }
    query = query.eq('location_id', profile.location_id)
  }

  const { data: sales, error } = await query

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          Error loading sales: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-gray-600 mt-1">
            {profile?.role === 'Branch_Manager'
              ? 'View and manage your location sales'
              : 'View all sales across locations'}
          </p>
        </div>
        {profile?.role === 'Branch_Manager' && (
          <Link href="/sales/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Sale
            </Button>
          </Link>
        )}
      </div>

      <SalesList sales={sales || []} />
    </div>
  )
}
