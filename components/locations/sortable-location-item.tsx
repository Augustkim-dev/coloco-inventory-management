'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Location {
  id: string
  name: string
  location_type: string
  country_code: string
  display_order: number
}

interface SortableLocationItemProps {
  location: Location
}

export function SortableLocationItem({ location }: SortableLocationItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? 'shadow-lg' : ''}>
        <CardContent className="flex items-center gap-4 p-4">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Order Number */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {location.display_order}
          </div>

          {/* Location Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{location.name}</h3>
              <Badge variant={location.location_type === 'HQ' ? 'default' : 'secondary'}>
                {location.location_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Country: {location.country_code}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
