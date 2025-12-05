import { createClient } from '@/lib/supabase/server'
import { PricingForm } from '@/components/pricing/pricing-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'

export default async function EditPricingPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  // 기존 pricing config 조회
  const { data: existingConfig, error: configError } = await supabase
    .from('pricing_configs')
    .select('*')
    .eq('id', params.id)
    .single()

  if (configError || !existingConfig) {
    notFound()
  }

  // HQ 지사 조회
  const { data: hqLocation, error: hqError } = await supabase
    .from('locations')
    .select('id, name')
    .eq('location_type', 'HQ')
    .single()

  if (hqError || !hqLocation) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading HQ location</h3>
          <p className="text-red-600 text-sm mt-1">
            {hqError?.message || 'HQ location not found'}
          </p>
        </div>
      </div>
    )
  }

  // 지사 목록 (Branch와 SubBranch 모두)
  const { data: branches, error: branchesError } = await supabase
    .from('locations')
    .select('id, name, country_code, currency, location_type, parent_id, level')
    .in('location_type', ['Branch', 'SubBranch'])
    .eq('is_active', true)
    .order('display_order')

  if (branchesError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading branches</h3>
          <p className="text-red-600 text-sm mt-1">{branchesError.message}</p>
        </div>
      </div>
    )
  }

  // 제품 목록
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name, unit')
    .order('sku')

  if (productsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading products</h3>
          <p className="text-red-600 text-sm mt-1">{productsError.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pricing">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Pricing
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Edit Pricing Configuration</h1>
        <p className="text-gray-600 mt-1">
          Update selling price calculation parameters
        </p>
      </div>

      <PricingForm
        hqLocation={hqLocation}
        branches={branches || []}
        products={products || []}
        mode="edit"
        existingConfig={existingConfig}
      />
    </div>
  )
}
