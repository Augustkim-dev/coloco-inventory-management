'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'
import type { Currency } from '@/types'

export interface PriceListItem {
  id: string
  product: {
    sku: string
    name: string
  }
  parentPrice: number | null  // Parent의 discounted_price = 구매단가
  sub_branch_margin_percent: number | null
  final_price: number
  discounted_price: number | null
  discount_percent: number | null
  currency: string
}

interface PriceListTableProps {
  pricingConfigs: PriceListItem[]
  locationName: string
  currency: Currency
}

export function PriceListTable({
  pricingConfigs,
  locationName,
  currency,
}: PriceListTableProps) {
  // Sort by product SKU
  const sortedConfigs = [...pricingConfigs].sort((a, b) =>
    a.product.sku.localeCompare(b.product.sku)
  )

  if (sortedConfigs.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">
          가격 설정이 없습니다
        </p>
        <p className="text-sm">
          이 지점에 대한 가격 설정을 먼저 추가해주세요.
        </p>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Get margin percent for header (use first config's value)
  const marginPercent = sortedConfigs[0]?.sub_branch_margin_percent || 0

  return (
    <div className="print-container">
      {/* Print Header - Only visible when printing */}
      <div className="print-only print-header">
        <h1>{locationName} 가격표</h1>
        <p>발행일: {today}</p>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto no-print">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">제품코드</TableHead>
              <TableHead>제품명</TableHead>
              <TableHead className="text-right w-[140px]">구매단가</TableHead>
              <TableHead className="text-right w-[140px]">지부마진 ({marginPercent}%)</TableHead>
              <TableHead className="text-right w-[140px]">소비자가</TableHead>
              <TableHead className="text-right w-[160px]">할인 최종가</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedConfigs.map((config) => {
              const discountPercent = config.discount_percent || 0
              const discountedPrice = config.discounted_price || config.final_price
              const parentPrice = config.parentPrice || 0
              const marginAmount = discountedPrice - parentPrice

              return (
                <TableRow key={config.id}>
                  <TableCell className="font-mono text-sm">
                    {config.product.sku}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{config.product.name}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {parentPrice > 0 ? formatCurrency(parentPrice, currency) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {parentPrice > 0 ? formatCurrency(marginAmount, currency) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(config.final_price, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={cn(
                      "font-semibold",
                      discountPercent > 0 && "text-green-600"
                    )}>
                      {formatCurrency(discountedPrice, currency)}
                    </div>
                    {discountPercent > 0 && (
                      <div className="text-xs text-gray-500">
                        -{discountPercent}% 할인
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Print-only Table with special styling */}
      <table className="print-only price-list-print">
        <thead>
          <tr>
            <th>제품코드</th>
            <th>제품명</th>
            <th style={{ textAlign: 'right' }}>구매단가 ({currency})</th>
            <th style={{ textAlign: 'right' }}>지부마진 ({marginPercent}%)</th>
            <th style={{ textAlign: 'right' }}>소비자가 ({currency})</th>
            <th style={{ textAlign: 'right' }}>할인 최종가 ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {sortedConfigs.map((config) => {
            const discountPercent = config.discount_percent || 0
            const discountedPrice = config.discounted_price || config.final_price
            const parentPrice = config.parentPrice || 0
            const marginAmount = discountedPrice - parentPrice

            return (
              <tr key={config.id}>
                <td>{config.product.sku}</td>
                <td>{config.product.name}</td>
                <td style={{ textAlign: 'right' }}>
                  {parentPrice > 0 ? formatCurrency(parentPrice, currency) : '-'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {parentPrice > 0 ? formatCurrency(marginAmount, currency) : '-'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(config.final_price, currency)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(discountedPrice, currency)}
                  {discountPercent > 0 && ` (-${discountPercent}%)`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
