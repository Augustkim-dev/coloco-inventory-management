'use client'

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
import { Edit } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'
import { useMemo } from 'react'

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
  }
  purchase_price: number
  transfer_cost: number
  hq_margin_percent: number
  branch_margin_percent: number
  exchange_rate: number
  calculated_price: number
  final_price: number
  currency: string
  updated_at: string
}

interface GroupedPricing {
  branchName: string
  countryCode: string
  currency: string
  displayOrder: number
  configs: PricingConfig[]
}

export function PricingList({
  pricingConfigs,
}: {
  pricingConfigs: PricingConfig[]
}) {
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
          configs: [],
        }
      }

      groups[key].configs.push(config)
    })

    // display_order 기준으로 정렬 (Reorder Location 설정 따름)
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

  return (
    <Accordion type="multiple" className="space-y-4">
      {groupedByBranch.map((group) => (
        <AccordionItem
          key={`${group.branchName}-${group.countryCode}`}
          value={`${group.branchName}-${group.countryCode}`}
          className="border rounded-lg"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">
                  {group.branchName}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {group.countryCode}
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
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Transfer Cost</TableHead>
                    <TableHead className="text-center">Margins</TableHead>
                    <TableHead className="text-right">Exchange Rate</TableHead>
                    <TableHead className="text-right">Final Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{config.product.sku}</div>
                          <div className="text-sm text-gray-500">
                            {config.product.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(config.purchase_price, 'KRW')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(config.transfer_cost, 'KRW')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Badge variant="secondary" className="text-xs">
                            HQ: {config.hq_margin_percent}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Branch: {config.branch_margin_percent}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <div>1 KRW =</div>
                          <div className="font-medium">
                            {config.exchange_rate} {config.currency}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-lg">
                          {formatCurrency(
                            config.final_price,
                            config.currency as Currency
                          )}
                        </div>
                        {config.calculated_price !== config.final_price && (
                          <div className="text-xs text-gray-500 line-through">
                            {formatCurrency(
                              config.calculated_price,
                              config.currency as Currency
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/pricing/${config.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
