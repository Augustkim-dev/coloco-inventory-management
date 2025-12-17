'use client'

import { useMemo, useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { PriceListTable, type PriceListItem } from './price-list-table'
import { PriceListExport } from './price-list-export'
import { sortByHierarchyAndOrder } from '@/lib/hierarchy-utils'
import type { Location, Currency } from '@/types'
import { Globe, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

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

// Raw pricing config from Supabase (can have arrays)
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

interface PriceListTabsProps {
  locations: Location[]
  allLocations: Location[]
  pricingConfigs: RawPricingConfig[]
  accessibleLocationIds: string[]
}

// 국가(Branch)별로 SubBranch 그룹핑
interface LocationGroup {
  branch: Location
  subBranches: Location[]
  totalConfigCount: number
}

// Helper to normalize to_location (handle both object and array from Supabase)
function getToLocation(config: RawPricingConfig): ToLocation | null {
  if (!config.to_location) return null
  if (Array.isArray(config.to_location)) {
    return config.to_location[0] || null
  }
  return config.to_location
}

// Helper to normalize product (handle both object and array from Supabase)
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

// Convert raw config to PriceListItem with parent price
function toPriceListItemWithParentPrice(
  config: RawPricingConfig,
  allConfigs: RawPricingConfig[],
  allLocations: Location[]
): PriceListItem | null {
  const product = getProduct(config)
  const toLocation = getToLocation(config)
  if (!product || !toLocation) return null

  // Find parent location
  const location = allLocations.find(l => l.id === toLocation.id)
  const parentLocationId = location?.parent_id || null

  // Get parent's discounted price as purchase price for this location
  const parentPrice = getParentPrice(product.id, parentLocationId, allConfigs)

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
}

export function PriceListTabs({
  locations,
  allLocations,
  pricingConfigs,
}: PriceListTabsProps) {
  // Sort locations by hierarchy
  const sortedLocations = useMemo(() => {
    return sortByHierarchyAndOrder(locations)
  }, [locations])

  // 국가(Branch)별로 SubBranch 그룹핑 (display_order 순서로 정렬)
  const groupedLocations = useMemo((): LocationGroup[] => {
    const branches = sortedLocations
      .filter(loc => loc.location_type === 'Branch')
      .sort((a, b) => a.display_order - b.display_order)
    return branches.map(branch => {
      const subBranches = sortedLocations.filter(loc => loc.parent_id === branch.id)
      const totalConfigCount = subBranches.reduce((sum, sub) => {
        return sum + pricingConfigs.filter(c => getToLocation(c)?.id === sub.id).length
      }, 0)
      return { branch, subBranches, totalConfigCount }
    })
  }, [sortedLocations, pricingConfigs])

  // 선택된 국가(Branch) ID
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  // 선택된 지점(SubBranch) ID
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')

  // 현재 선택된 그룹
  const currentGroup = useMemo(() =>
    groupedLocations.find(g => g.branch.id === selectedBranchId)
  , [groupedLocations, selectedBranchId])

  // 현재 선택된 지점
  const currentLocation = useMemo(() => {
    return sortedLocations.find(loc => loc.id === selectedLocationId)
  }, [sortedLocations, selectedLocationId])

  // 국가 변경 시 첫 번째 SubBranch 자동 선택
  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId)
    const group = groupedLocations.find(g => g.branch.id === branchId)
    if (group?.subBranches.length) {
      setSelectedLocationId(group.subBranches[0].id)
    }
  }

  // 초기화: 첫 번째 국가의 첫 번째 지점 선택
  useEffect(() => {
    if (groupedLocations.length > 0 && !selectedBranchId) {
      const firstGroup = groupedLocations[0]
      setSelectedBranchId(firstGroup.branch.id)
      if (firstGroup.subBranches.length > 0) {
        setSelectedLocationId(firstGroup.subBranches[0].id)
      }
    }
  }, [groupedLocations, selectedBranchId])

  // Filter pricing configs for current location and convert to PriceListItem with parent price
  const filteredConfigs = useMemo(() => {
    return pricingConfigs
      .filter(config => {
        const loc = getToLocation(config)
        return loc?.id === selectedLocationId
      })
      .map(config => toPriceListItemWithParentPrice(config, pricingConfigs, allLocations))
      .filter((item): item is PriceListItem => item !== null)
  }, [pricingConfigs, selectedLocationId, allLocations])

  if (sortedLocations.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">
          접근 가능한 지점이 없습니다
        </p>
        <p className="text-sm">
          관리자에게 권한을 요청해주세요.
        </p>
      </div>
    )
  }

  if (groupedLocations.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">
          표시할 지점이 없습니다
        </p>
        <p className="text-sm">
          국가(Branch) 데이터가 필요합니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1단계: 국가 탭 */}
      <div className="bg-muted/30 rounded-lg p-1.5 no-print">
        <div className="flex flex-wrap gap-1">
          {groupedLocations.map(({ branch, totalConfigCount }) => (
            <button
              key={branch.id}
              onClick={() => handleBranchChange(branch.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                selectedBranchId === branch.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Globe className="h-4 w-4" />
              {branch.name}
              <Badge
                variant={selectedBranchId === branch.id ? "secondary" : "outline"}
                className="ml-1 h-5 px-1.5 text-xs"
              >
                {totalConfigCount}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* 2단계: 지점/채널 탭 */}
      {currentGroup && currentGroup.subBranches.length > 0 && (
        <div className="flex flex-wrap gap-1 no-print">
          {currentGroup.subBranches.map((subBranch) => {
            const configCount = pricingConfigs.filter(c =>
              getToLocation(c)?.id === subBranch.id
            ).length

            return (
              <button
                key={subBranch.id}
                onClick={() => setSelectedLocationId(subBranch.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  selectedLocationId === subBranch.id
                    ? "font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
                style={selectedLocationId === subBranch.id ? {
                  backgroundColor: '#DAE3F3',
                  color: '#2F5597'
                } : undefined}
              >
                <MapPin className="h-3.5 w-3.5" />
                {subBranch.name}
                <Badge
                  variant="outline"
                  className="ml-1 h-5 px-1.5 text-xs"
                  style={selectedLocationId === subBranch.id ? {
                    borderColor: '#2F5597',
                    color: '#2F5597'
                  } : undefined}
                >
                  {configCount}
                </Badge>
              </button>
            )
          })}
        </div>
      )}

      {/* 액션 버튼 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        {/* Location info */}
        {currentLocation && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">
              {currentLocation.location_type || 'SubBranch'}
            </Badge>
            <Badge variant="secondary">
              {currentLocation.currency || 'KRW'}
            </Badge>
            <span>|</span>
            <span>{filteredConfigs.length}개 제품</span>
          </div>
        )}

        {/* Export buttons */}
        {currentLocation && (
          <PriceListExport
            pricingConfigs={filteredConfigs}
            locationName={currentLocation.name}
            currency={currentLocation.currency || 'KRW'}
            marginPercent={filteredConfigs[0]?.sub_branch_margin_percent || undefined}
            locationId={currentLocation.id}
          />
        )}
      </div>

      {/* 가격표 테이블 */}
      {currentLocation && (
        <PriceListTable
          pricingConfigs={filteredConfigs}
          locationName={currentLocation.name}
          currency={(currentLocation.currency || 'KRW') as Currency}
        />
      )}
    </div>
  )
}
