'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Location } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, AlertCircle } from 'lucide-react'

const LOCATION_TYPES = [
  { value: 'HQ', label: 'Headquarters' },
  { value: 'Branch', label: 'Branch' },
  { value: 'SubBranch', label: 'Sub-Branch' },
]

const COUNTRY_CODES = [
  { code: 'KR', name: 'Korea', currency: 'KRW' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'CN', name: 'China', currency: 'CNY' },
]

interface LocationCreateFormProps {
  userRole?: string
  userLocationId?: string | null
}

export function LocationCreateForm({ userRole, userLocationId }: LocationCreateFormProps) {
  // For Branch Manager, default to SubBranch and their branch as parent
  const isBranchManager = userRole === 'Branch_Manager'

  const [formData, setFormData] = useState({
    name: '',
    location_type: isBranchManager ? 'SubBranch' : '',
    country_code: '',
    currency: '',
    parent_id: isBranchManager && userLocationId ? userLocationId : '',
    address: '',
    contact_person: '',
    phone: '',
    is_active: true,
  })
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch existing locations for parent selection
  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('path', { ascending: true })

        if (error) throw error
        setLocations(data || [])

        // Auto-fill country and currency from parent branch for Branch Managers
        if (isBranchManager && userLocationId) {
          const parentBranch = data?.find((loc) => loc.id === userLocationId)
          if (parentBranch) {
            setFormData((prev) => ({
              ...prev,
              country_code: parentBranch.country_code,
              currency: parentBranch.currency,
            }))
          }
        }
      } catch (error: any) {
        console.error('Error fetching locations:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load locations',
        })
      } finally {
        setLoadingLocations(false)
      }
    }

    fetchLocations()
  }, [isBranchManager, userLocationId])

  // Auto-set currency when country is selected
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRY_CODES.find((c) => c.code === countryCode)
    setFormData({
      ...formData,
      country_code: countryCode,
      currency: country?.currency || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.location_type || !formData.country_code || !formData.currency) {
        throw new Error('Please fill in all required fields')
      }

      // Validate SubBranch has parent
      if (formData.location_type === 'SubBranch' && !formData.parent_id) {
        throw new Error('Sub-Branch must have a parent location')
      }

      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create location')
      }

      toast({
        title: 'Success',
        description: 'Location created successfully',
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

  // Filter parent locations based on selected type
  const getParentLocations = () => {
    if (formData.location_type === 'SubBranch') {
      // SubBranch can have HQ or Branch as parent
      return locations.filter((loc) => loc.location_type === 'HQ' || loc.location_type === 'Branch')
    }
    return []
  }

  const showParentSelector = formData.location_type === 'SubBranch'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <div>
            <CardTitle>
              {isBranchManager ? 'Create New Sub-Branch' : 'Create New Location'}
            </CardTitle>
            <CardDescription>
              {isBranchManager
                ? 'Add a new sub-branch under your branch'
                : 'Add a new headquarters, branch, or sub-branch'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Type - Hidden for Branch Manager (always SubBranch) */}
          {!isBranchManager && (
            <div className="space-y-2">
              <Label htmlFor="location_type">
                Location Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.location_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, location_type: value, parent_id: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Parent Location (for SubBranch) */}
          {showParentSelector && (
            <div className="space-y-2">
              <Label htmlFor="parent_id">
                Parent Location <span className="text-red-500">*</span>
              </Label>
              {loadingLocations ? (
                <div className="text-sm text-muted-foreground">Loading locations...</div>
              ) : isBranchManager ? (
                // Branch Manager: Show their branch name (read-only)
                <Input
                  value={locations.find((loc) => loc.id === userLocationId)?.name || 'Your Branch'}
                  disabled
                  className="bg-gray-50"
                />
              ) : (
                // HQ Admin: Show dropdown
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parent_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent location" />
                  </SelectTrigger>
                  <SelectContent>
                    {getParentLocations().map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({location.location_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!isBranchManager && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sub-branches must be assigned to a parent location (HQ or Branch)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">
                Location Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Seoul Headquarters, Hanoi Sub-Branch"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code">
                Country <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.country_code}
                onValueChange={handleCountryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency <span className="text-red-500">*</span>
              </Label>
              <Input
                id="currency"
                value={formData.currency}
                disabled
                className="bg-gray-50"
                placeholder="Auto-filled"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contact Information (Optional)</h3>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                placeholder="Enter full address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  placeholder="Manager name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+82-10-1234-5678"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Location'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
