'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Edit, Trash2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { Currency } from '@/types'
import { useMemo } from 'react'
import { DeletePricingDialog } from './delete-pricing-dialog'

interface PricingConfig {
  id: string
  product: {
    sku: string
    name: string
  }
  to_location: {
    name: string
    country_code: string
    currency: string
    display_order: number
    level?: number
    location_type?: string
    path?: string
    parent_id?: string | null
  }
  purchase_price: number
  transfer_cost: number
  hq_margin_percent: number
  branch_margin_percent: number
  sub_branch_margin_percent?: number
  discount_percent?: number
  exchange_rate: number
  calculated_price: number
  final_price: number
  discounted_price?: number
  currency: string
  updated_at: string
}

interface GroupedPricing {
  branchName: string
  countryCode: string
  currency: string
  displayOrder: number
  level: number
  locationType: string
  path: string
  parentId: string | null
  configs: PricingConfig[]
}

export function PricingList({
  pricingConfigs,
}: {
  pricingConfigs: PricingConfig[]
}) {
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    config: PricingConfig | null
  }>({ isOpen: false, config: null })

  // Branch별로 데이터 그룹화
  const groupedByBranch = useMemo(() => {
    const groups: { [key: string]: GroupedPricing } = {}

    pricingConfigs.forEach((config) => {
      const key = `${config.to_location.name}-${config.to_location.country_code}`

      if (!groups[key]) {
        groups[key] = {
          branchName: config.to_location.name,
          countryCode: config.to_location.country_code,
          currency: config.currency,
          displayOrder: config.to_location.display_order,
          level: config.to_location.level || 2,
          locationType: config.to_location.location_type || 'Branch',
          path: config.to_location.path || '',
          parentId: config.to_location.parent_id ?? null,
          configs: [],
        }
      }

      groups[key].configs.push(config)
    })

    // display_order 기준으로 정렬 (Locations 페이지의 Reorder 결과 반영)
    return Object.values(groups).sort((a, b) => a.displayOrder - b.displayOrder)
  }, [pricingConfigs])

  // 데이터가 없는 경우
  if (pricingConfigs.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">
          No pricing configurations found
        </p>
        <p className="text-sm">
          Add your first pricing configuration to get started.
        </p>
      </div>
    )
  }

  // 마진 표시 helper
  const formatMargins = (config: PricingConfig, isSubBranch: boolean) => {
    const margins = [`HQ: ${config.hq_margin_percent}%`, `Branch: ${config.branch_margin_percent}%`]
    if (isSubBranch && config.sub_branch_margin_percent && config.sub_branch_margin_percent > 0) {
      margins.push(`SubBranch: ${config.sub_branch_margin_percent}%`)
    }
    return margins
  }

  return (
    <>
      <Accordion type="multiple" className="space-y-4">
        {groupedByBranch.map((group) => {
          // SubBranch인지 확인 (level 3 이상)
          const isSubBranch = group.level >= 3

          return (
            <AccordionItem
              key={`${group.branchName}-${group.countryCode}`}
              value={`${group.branchName}-${group.countryCode}`}
              className={cn(
                "border rounded-lg",
                isSubBranch && "ml-6 border-l-2 border-l-muted-foreground/30"
              )}
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    {isSubBranch && (
                      <span className="text-muted-foreground text-sm">└</span>
                    )}
                    <h3 className={cn("font-semibold", isSubBranch ? "text-base" : "text-lg")}>
                      {group.branchName}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {group.locationType}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {group.currency}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    {group.configs.length} {group.configs.length === 1 ? 'product' : 'products'}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pb-4">
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Purchase</TableHead>
                        <TableHead className="text-right">Transfer</TableHead>
                        <TableHead className="text-center">Margins</TableHead>
                        <TableHead className="text-center">Discount</TableHead>
                        <TableHead className="text-right">Consumer Price</TableHead>
                        <TableHead className="text-right">Discounted Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.configs.map((config) => {
                        const discountPercent = config.discount_percent || 0
                        const discountedPrice = config.discounted_price || config.final_price

                        return (
                          <TableRow key={config.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{config.product.sku}</div>
                                <div className="text-sm text-gray-500">
                                  {config.product.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(config.purchase_price, 'KRW')}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(config.transfer_cost, 'KRW')}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {formatMargins(config, isSubBranch).map((margin, idx) => (
                                  <Badge
                                    key={idx}
                                    variant={idx === 0 ? 'secondary' : 'outline'}
                                    className="text-xs"
                                  >
                                    {margin}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={discountPercent > 0 ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {discountPercent}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-semibold">
                                {formatCurrency(
                                  config.final_price,
                                  config.currency as Currency
                                )}
                              </div>
                              {config.calculated_price !== config.final_price && (
                                <div className="text-xs text-gray-400 line-through">
                                  {formatCurrency(
                                    config.calculated_price,
                                    config.currency as Currency
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className={cn(
                                "font-bold text-lg",
                                discountPercent > 0 && "text-green-600"
                              )}>
                                {formatCurrency(
                                  discountedPrice,
                                  config.currency as Currency
                                )}
                              </div>
                              {discountPercent > 0 && (
                                <div className="text-xs text-gray-500">
                                  -{discountPercent}% off
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Link href={`/pricing/${config.id}/edit`}>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDialog({ isOpen: true, config })}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Delete Confirmation Dialog */}
      {deleteDialog.config && (
        <DeletePricingDialog
          configId={deleteDialog.config.id}
          productSku={deleteDialog.config.product.sku}
          productName={deleteDialog.config.product.name}
          branchName={deleteDialog.config.to_location.name}
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog({ isOpen: false, config: null })}
        />
      )}
    </>
  )
}
