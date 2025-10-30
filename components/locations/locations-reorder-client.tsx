'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { SortableLocationItem } from './sortable-location-item'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Location {
  id: string
  name: string
  location_type: string
  country_code: string
  display_order: number
}

interface LocationsReorderClientProps {
  initialLocations: Location[]
}

export function LocationsReorderClient({ initialLocations }: LocationsReorderClientProps) {
  const router = useRouter()
  const [locations, setLocations] = useState(initialLocations)
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setLocations((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)

      // Update display_order based on new position
      return newItems.map((item, index) => ({
        ...item,
        display_order: index + 1,
      }))
    })
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Update each location's display_order
      const updates = locations.map((location) =>
        supabase
          .from('locations')
          .update({ display_order: location.display_order })
          .eq('id', location.id)
      )

      const results = await Promise.all(updates)

      // Check if any update failed
      const hasError = results.some((result) => result.error)

      if (hasError) {
        toast.error('Failed to save location order')
        return
      }

      toast.success('Location order saved successfully')
      router.push('/locations')
      router.refresh()
    } catch (error) {
      console.error('Error saving location order:', error)
      toast.error('Failed to save location order')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/locations')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reorder Locations</h2>
          <p className="text-sm text-muted-foreground">
            Drag locations to change their display order
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={locations.map((loc) => loc.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {locations.map((location) => (
              <SortableLocationItem key={location.id} location={location} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Order'}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
