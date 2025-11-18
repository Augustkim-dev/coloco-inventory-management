'use client'

import { useState } from 'react'
import { Location } from '@/types'
import { LocationsList } from './locations-list'
import { LocationsTreeView } from './locations-tree-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { List, Network } from 'lucide-react'

interface LocationsViewClientProps {
  locations: Location[]
}

export function LocationsViewClient({ locations }: LocationsViewClientProps) {
  return (
    <Tabs defaultValue="tree" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tree" className="flex items-center gap-2">
          <Network className="h-4 w-4" />
          Tree View
        </TabsTrigger>
        <TabsTrigger value="list" className="flex items-center gap-2">
          <List className="h-4 w-4" />
          List View
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tree" className="space-y-4">
        <LocationsTreeView locations={locations} />
      </TabsContent>

      <TabsContent value="list" className="space-y-4">
        <LocationsList locations={locations} />
      </TabsContent>
    </Tabs>
  )
}
