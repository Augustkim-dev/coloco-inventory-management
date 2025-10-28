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
}

export function LocationsList({ locations }: LocationsListProps) {
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
                {location.contact_person || '-'}
                {location.phone && ` (${location.phone})`}
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/locations/${location.id}/edit`}>
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
  )
}
