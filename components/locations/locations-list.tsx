'use client'

import { Location } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Edit } from 'lucide-react'

interface LocationsListProps {
  locations: Location[]
  userRole?: string
  userLocationId?: string | null
}

// Helper function to check if user can edit a location
function canEditLocation(
  location: Location,
  userRole?: string,
  userLocationId?: string | null
): boolean {
  // HQ Admin can edit all locations
  if (userRole === 'HQ_Admin') {
    return true
  }

  // Branch Manager can edit:
  // 1. Their own branch (if location_id matches)
  // 2. Sub-branches under their branch (parent_location_id matches their branch)
  if (userRole === 'Branch_Manager' && userLocationId) {
    // Can edit their own branch
    if (location.id === userLocationId) {
      return true
    }
    // Can edit sub-branches under their branch
    if (location.parent_location_id === userLocationId && location.location_type === 'SubBranch') {
      return true
    }
  }

  return false
}

export function LocationsList({ locations, userRole, userLocationId }: LocationsListProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell className="font-medium">{location.name}</TableCell>
              <TableCell>
                <Badge variant={location.location_type === 'HQ' ? 'default' : 'secondary'}>
                  {location.location_type}
                </Badge>
              </TableCell>
              <TableCell>{location.country_code}</TableCell>
              <TableCell>{location.currency}</TableCell>
              <TableCell>
                {(location as any).contact_person || '-'}
                {(location as any).phone && ` (${(location as any).phone})`}
              </TableCell>
              <TableCell className="text-right">
                {canEditLocation(location, userRole, userLocationId) && (
                  <Link href={`/locations/${location.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
