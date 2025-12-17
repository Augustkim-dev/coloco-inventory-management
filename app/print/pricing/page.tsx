import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PrintView, type PrintViewItem } from '@/components/pricing/price-list-view/print-view'
import type { Currency } from '@/types'

interface ToLocation {
  id: string
  name: string
  location_type: string
  level: number
  parent_id: string | null
  currency: string
  display_order: number
}

interface Product {
  id: string
  sku: string
  name: string
}

interface RawPricingConfig {
  id: string
  product_id: string
  to_location_id: string
  sub_branch_margin_percent: number | null
  final_price: number
  discounted_price: number | null
  discount_percent: number | null
  currency: string
  product: Product | Product[]
  to_location: ToLocation | ToLocation[]
}

// Helper to normalize to_location
function getToLocation(config: RawPricingConfig): ToLocation | null {
  if (!config.to_location) return null
  if (Array.isArray(config.to_location)) {
    return config.to_location[0] || null
  }
  return config.to_location
}

// Helper to normalize product
function getProduct(config: RawPricingConfig): Product | null {
  if (!config.product) return null
  if (Array.isArray(config.product)) {
    return config.product[0] || null
  }
  return config.product
}

// Get parent location's discounted_price for a product
function getParentPrice(
  productId: string,
  parentLocationId: string | null,
  allConfigs: RawPricingConfig[]
): number | null {
  if (!parentLocationId) return null

  const parentConfig = allConfigs.find(c => {
    const product = getProduct(c)
    const loc = getToLocation(c)
    return product?.id === productId && loc?.id === parentLocationId
  })

  if (!parentConfig) return null
  return parentConfig.discounted_price || parentConfig.final_price
}

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; mode?: string }>
}) {
  const params = await searchParams
  const locationId = params.locationId
  const mode = params.mode as 'print' | 'pdf' | undefined

  if (!locationId) {
    return (
      <div className="print-page">
        <div className="text-center text-red-500 py-12">
          <p className="text-lg font-medium mb-2">잘못된 요청</p>
          <p className="text-sm">locationId 파라미터가 필요합니다.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get location info
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name, currency, parent_id, location_type')
    .eq('id', locationId)
    .single()

  if (locationError || !location) {
    return (
      <div className="print-page">
        <div className="text-center text-red-500 py-12">
          <p className="text-lg font-medium mb-2">지점을 찾을 수 없습니다</p>
          <p className="text-sm">{locationError?.message}</p>
        </div>
      </div>
    )
  }

  // Fetch ALL pricing configs (needed to lookup parent prices)
  const { data: allPricingConfigs, error: pricingError } = await supabase
    .from('pricing_configs')
    .select(`
      id,
      product_id,
      to_location_id,
      sub_branch_margin_percent,
      final_price,
      discounted_price,
      discount_percent,
      currency,
      product:products!inner(id, sku, name),
      to_location:locations!pricing_configs_to_location_id_fkey(
        id, name, location_type, level, parent_id, currency, display_order
      )
    `)
    .order('updated_at', { ascending: false })

  if (pricingError) {
    return (
      <div className="print-page">
        <div className="text-center text-red-500 py-12">
          <p className="text-lg font-medium mb-2">가격 설정 로드 실패</p>
          <p className="text-sm">{pricingError.message}</p>
        </div>
      </div>
    )
  }

  // Filter configs for the requested location
  const locationConfigs = (allPricingConfigs || []).filter(config => {
    const loc = getToLocation(config)
    return loc?.id === locationId
  })

  // Convert to PrintViewItem with parent price
  const printViewItems: PrintViewItem[] = locationConfigs
    .map(config => {
      const product = getProduct(config)
      if (!product) return null

      const parentPrice = getParentPrice(
        product.id,
        location.parent_id,
        allPricingConfigs || []
      )

      return {
        id: config.id,
        product: {
          sku: product.sku,
          name: product.name,
        },
        parentPrice,
        sub_branch_margin_percent: config.sub_branch_margin_percent,
        final_price: config.final_price,
        discounted_price: config.discounted_price,
        discount_percent: config.discount_percent,
        currency: config.currency,
      }
    })
    .filter((item): item is PrintViewItem => item !== null)

  // Get margin percent for header
  const marginPercent = printViewItems[0]?.sub_branch_margin_percent || null

  return (
    <PrintView
      pricingConfigs={printViewItems}
      locationName={location.name}
      currency={(location.currency || 'KRW') as Currency}
      marginPercent={marginPercent}
      mode={mode}
    />
  )
}
