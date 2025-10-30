'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { GripVertical } from 'lucide-react'
import {
  getExpiryBadgeVariant,
  getExpiryEmoji,
  formatCurrency,
  formatDate,
} from '@/lib/inventory-utils'
import { cn } from '@/lib/utils'
import { StockBatch } from '@/types'

interface BatchCardProps {
  batch: StockBatch & {
    product?: {
      sku: string
      name: string
      unit: string
    }
    location?: {
      currency: string
    }
  }
  locationId?: string
  isDraggable?: boolean
  isDragging?: boolean
}

export function BatchCard({
  batch,
  locationId,
  isDraggable = true,
  isDragging = false,
}: BatchCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `batch-${batch.id}`,
    data: { batch, locationId },
    disabled: !isDraggable,
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  // 만료일 색상 및 이모지
  const expiryVariant = getExpiryBadgeVariant(batch.expiry_date)
  const expiryEmoji = getExpiryEmoji(batch.expiry_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      className={cn(
        'group relative',
        'bg-card border rounded-lg',
        'transition-all duration-200',
        isDraggable &&
          'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/50',
        isDragging && 'opacity-50 shadow-lg',
        !isDraggable && 'cursor-default'
      )}
    >
      {/* Card Content - 반응형 레이아웃 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 p-3 md:p-4">
        {/* Left Section: 제품 정보 */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Drag Handle - Desktop만 표시 */}
          {isDraggable && (
            <GripVertical className="hidden md:block w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
          )}

          {/* 제품명 + SKU */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">
                {batch.product?.name || 'Unknown Product'}
              </span>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {batch.product?.sku}
              </Badge>
            </div>

            {/* 배치 번호 - Mobile에서는 아래로 */}
            <div className="mt-1 text-sm text-muted-foreground">
              📦 Batch: <span className="font-mono">{batch.batch_no}</span>
            </div>
          </div>
        </div>

        {/* Middle Section: 수량 및 날짜 - 반응형 */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm">
          {/* 수량 */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Qty:</span>
            <span className="font-semibold text-base">
              {batch.qty_on_hand}
            </span>
            <span className="text-muted-foreground">
              {batch.product?.unit || 'units'}
            </span>
          </div>

          {/* 제조일자 */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Mfg:</span>
            <span className="font-mono text-xs">
              {formatDate(batch.manufactured_date)}
            </span>
          </div>

          {/* 단가 */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-semibold">
              {formatCurrency(
                batch.unit_cost,
                batch.location?.currency || 'KRW'
              )}
            </span>
          </div>
        </div>

        {/* Right Section: 만료일 Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl" aria-hidden="true">
            {expiryEmoji}
          </span>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Expiry</span>
            <Badge variant={expiryVariant} className="font-mono text-xs">
              {formatDate(batch.expiry_date)}
            </Badge>
          </div>
        </div>

        {/* Quality Status Badge (OK가 아닐 때만) */}
        {batch.quality_status !== 'OK' && (
          <div className="absolute top-2 right-2 md:relative md:top-0 md:right-0">
            <Badge
              variant={
                batch.quality_status === 'Damaged' ? 'destructive' : 'secondary'
              }
              className="text-xs"
            >
              {batch.quality_status}
            </Badge>
          </div>
        )}
      </div>

      {/* Drag Indicator - 드래그 중 표시 */}
      {isDraggable && (
        <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
      )}
    </div>
  )
}
