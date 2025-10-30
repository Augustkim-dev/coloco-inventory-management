'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { BatchCard } from './batch-card'
import { calculateLocationStats } from '@/lib/inventory-utils'
import { cn } from '@/lib/utils'
import { StockBatch, Location } from '@/types'

interface LocationAccordionProps {
  location: Location
  batches: (StockBatch & {
    product?: {
      sku: string
      name: string
      unit: string
    }
    location?: {
      currency: string
    }
  })[]
  userRole: string
}

export function LocationAccordion({
  location,
  batches,
  userRole,
}: LocationAccordionProps) {
  // AccordionTrigger를 Droppable 영역으로 설정
  const { setNodeRef, isOver } = useDroppable({
    id: location.id,
  })

  // Location 통계
  const stats = calculateLocationStats(batches)

  return (
    <AccordionItem
      value={location.id}
      className={cn(
        'border rounded-lg',
        isOver && 'ring-2 ring-primary bg-accent/50' // 드롭 가능 시 하이라이트
      )}
    >
      {/* Header - Droppable 영역 */}
      <AccordionTrigger
        ref={setNodeRef}
        className={cn('px-4 py-3 hover:no-underline', isOver && 'bg-accent')}
      >
        <div className="flex items-center justify-between w-full pr-4">
          {/* Left: Location 정보 */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg">{location.name}</span>
            <Badge variant="outline" className="text-xs">
              {location.location_type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {location.currency}
            </Badge>
          </div>

          {/* Right: 통계 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{stats.productCount} products</span>
            <span className="font-semibold text-foreground">
              {stats.totalUnits} units
            </span>
          </div>
        </div>
      </AccordionTrigger>

      {/* Content - Product Cards */}
      <AccordionContent className="px-4 pb-4 pt-2">
        {batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No stock available
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                locationId={location.id}
                isDraggable={userRole === 'HQ_Admin'}
              />
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
