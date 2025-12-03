import { createClient } from '@/lib/supabase/server'
import { HierarchicalTransferForm } from '@/components/inventory/hierarchical-transfer-form'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function TransferPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile - HQ Admin and Branch Manager can access transfer
  const { data: profile } = await supabase
    .from('users')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['HQ_Admin', 'Branch_Manager'].includes(profile.role)) {
    redirect('/inventory')
  }

  // Get all active locations for hierarchical transfer
  const { data: allLocations, error: locationsError } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('path', { ascending: true })

  if (locationsError) {
    console.error('Error loading locations:', locationsError)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading locations</p>
          <p className="text-sm text-muted-foreground">{locationsError.message}</p>
        </div>
      </div>
    )
  }

  // Get all products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('sku', { ascending: true })

  if (productsError) {
    console.error('Error loading products:', productsError)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading products</p>
          <p className="text-sm text-muted-foreground">{productsError.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Transfer Stock</h1>
        <p className="text-muted-foreground mt-1">
          {profile.role === 'HQ_Admin'
            ? 'Transfer inventory between locations in the hierarchy'
            : 'Transfer inventory to child locations'}
        </p>
      </div>

      <HierarchicalTransferForm
        userRole={profile.role as any}
        userLocationId={profile.location_id}
        allLocations={allLocations || []}
        products={products || []}
      />
    </div>
  )
}
