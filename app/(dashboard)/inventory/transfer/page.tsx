import { createClient } from '@/lib/supabase/server'
import { TransferForm } from '@/components/inventory/transfer-form'
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

  // Get user profile - only HQ Admin can access transfer
  const { data: profile } = await supabase
    .from('users')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'HQ_Admin') {
    redirect('/inventory')
  }

  // Get HQ location
  const { data: hqLocation, error: hqError } = await supabase
    .from('locations')
    .select('id')
    .eq('location_type', 'HQ')
    .single()

  if (hqError || !hqLocation) {
    console.error('Error loading HQ location:', hqError)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading HQ location</p>
          <p className="text-sm text-muted-foreground">
            {hqError?.message || 'HQ location not found'}
          </p>
        </div>
      </div>
    )
  }

  // Get branch locations (destination options)
  const { data: branches, error: branchError } = await supabase
    .from('locations')
    .select('id, name, country_code')
    .eq('location_type', 'Branch')
    .order('name')

  if (branchError) {
    console.error('Error loading branches:', branchError)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading branches</p>
          <p className="text-sm text-muted-foreground">{branchError.message}</p>
        </div>
      </div>
    )
  }

  // Get products that have stock at HQ
  // We need to get distinct products from stock_batches where HQ has inventory
  const { data: stockBatches, error: productsError } = await supabase
    .from('stock_batches')
    .select(`
      product_id,
      product:products(id, sku, name, unit)
    `)
    .eq('location_id', hqLocation.id)
    .eq('quality_status', 'OK')
    .gt('qty_on_hand', 0)

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

  // Extract unique products from stock batches
  const productMap = new Map()
  stockBatches?.forEach((batch: any) => {
    if (batch.product && !productMap.has(batch.product.id)) {
      productMap.set(batch.product.id, batch.product)
    }
  })
  const products = Array.from(productMap.values()).sort((a: any, b: any) =>
    a.sku.localeCompare(b.sku)
  )

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
          Transfer inventory from HQ to branch locations
        </p>
      </div>

      <TransferForm
        hqLocationId={hqLocation.id}
        branches={branches || []}
        products={products || []}
      />
    </div>
  )
}
