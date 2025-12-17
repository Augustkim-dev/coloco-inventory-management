import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PriceListTabs } from '@/components/pricing/price-list-view/price-list-tabs'
import { getAccessibleLocations } from '@/lib/hierarchy-utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function PriceListPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for role and location
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Error loading user profile:', profileError)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">사용자 정보 로드 실패</h3>
          <p className="text-red-600 text-sm mt-1">{profileError?.message}</p>
        </div>
      </div>
    )
  }

  // Get all active locations
  const { data: allLocations, error: locationsError } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (locationsError) {
    console.error('Error loading locations:', locationsError)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">지점 정보 로드 실패</h3>
          <p className="text-red-600 text-sm mt-1">{locationsError.message}</p>
        </div>
      </div>
    )
  }

  // Calculate accessible locations based on role
  const accessibleLocations = getAccessibleLocations(
    profile.location_id,
    profile.role,
    allLocations || []
  )

  // Filter to show only Branch and SubBranch (exclude HQ for price list)
  const filteredLocations = accessibleLocations.filter(
    loc => loc.location_type !== 'HQ'
  )

  // Get accessible location IDs
  const accessibleLocationIds = filteredLocations.map(loc => loc.id)

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
    console.error('Error loading pricing configs:', pricingError)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">가격 설정 로드 실패</h3>
          <p className="text-red-600 text-sm mt-1">{pricingError.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" />
                뒤로
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">가격표 보기</h1>
          <p className="text-gray-600 mt-1">
            지점별 가격표를 조회하고 인쇄 또는 엑셀로 다운로드할 수 있습니다
          </p>
        </div>
      </div>

      {/* Price List Tabs */}
      <PriceListTabs
        locations={filteredLocations}
        allLocations={allLocations || []}
        pricingConfigs={allPricingConfigs || []}
        accessibleLocationIds={accessibleLocationIds}
      />
    </div>
  )
}
