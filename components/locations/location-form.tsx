'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Location } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface LocationFormProps {
  location: Location
}

export function LocationForm({ location }: LocationFormProps) {
  const [formData, setFormData] = useState({
    address: location.address || '',
    contact_person: (location as any).contact_person || '',
    phone: (location as any).phone || '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('locations')
        .update(formData)
        .eq('id', location.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Location updated successfully',
      })

      router.push('/locations')
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Location - {location.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name (Read Only)</Label>
              <Input value={location.name} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>Type (Read Only)</Label>
              <Input value={location.location_type} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>Country Code (Read Only)</Label>
              <Input value={location.country_code} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>Currency (Read Only)</Label>
              <Input value={location.currency} disabled className="bg-gray-50" />
            </div>
          </div>

          {/* Editable fields */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              placeholder="Enter location address"
            />
          </div>

          <div>
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) =>
                setFormData({ ...formData, contact_person: e.target.value })
              }
              placeholder="Enter contact person name"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+82-10-1234-5678"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
