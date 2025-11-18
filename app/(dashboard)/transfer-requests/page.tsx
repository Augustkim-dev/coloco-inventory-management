import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransferRequestList } from '@/components/inventory/transfer-request-list'
import { TransferRequestForm } from '@/components/inventory/transfer-request-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAncestors } from '@/lib/hierarchy-utils'
import type { Location, Product } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TransferRequestsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with location info
  const { data: profile } = await supabase
    .from('users')
    .select('*, location:locations(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Fetch all locations for hierarchy
  const { data: allLocations } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('path', { ascending: true })

  // Fetch all products
  const { data: allProducts } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const userLocationId = profile.location_id
  const userRole = profile.role

  // Find parent location for SubBranch managers
  let parentLocation: Location | null = null
  if (userLocationId && allLocations) {
    const ancestors = getAncestors(userLocationId, allLocations)
    parentLocation = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null
  }

  const canCreateRequest = userLocationId && parentLocation !== null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transfer Requests</h1>
        <p className="text-muted-foreground mt-2">
          Manage stock transfer requests from sub-branches
        </p>
      </div>

      {canCreateRequest ? (
        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="manage">Manage Requests</TabsTrigger>
            <TabsTrigger value="create">Create New Request</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6">
            <TransferRequestList
              userLocationId={userLocationId}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <TransferRequestForm
              userLocationId={userLocationId}
              parentLocation={parentLocation}
              allProducts={allProducts || []}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <TransferRequestList
          userLocationId={userLocationId}
          userRole={userRole}
        />
      )}
    </div>
  )
}
