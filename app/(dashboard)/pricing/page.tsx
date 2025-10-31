import { createClient } from '@/lib/supabase/server'
import { PricingList } from '@/components/pricing/pricing-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function PricingPage() {
  const supabase = await createClient()

  const { data: pricingConfigs, error } = await supabase
    .from('pricing_configs')
    .select(
      `
      *,
      product:products!inner(sku, name),
      to_location:locations!pricing_configs_to_location_id_fkey(name, country_code, currency, display_order)
    `
    )
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error loading pricing configs:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading pricing configurations</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pricing Configuration</h1>
          <p className="text-gray-600 mt-1">
            Manage selling prices based on costs, margins, and exchange rates
          </p>
        </div>
        <Link href="/pricing/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Pricing
          </Button>
        </Link>
      </div>

      <PricingList pricingConfigs={pricingConfigs || []} />
    </div>
  )
}
