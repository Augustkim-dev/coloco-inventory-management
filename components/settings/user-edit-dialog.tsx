'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Location, UserRole } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save } from 'lucide-react'

interface UserEditDialogProps {
  user: User
  locations: Location[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isCurrentUser: boolean
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'HQ_Admin', label: 'HQ Administrator' },
  { value: 'Branch_Manager', label: 'Branch Manager' },
  { value: 'SubBranch_Manager', label: 'Sub-Branch Manager' },
]

export function UserEditDialog({
  user,
  locations,
  open,
  onOpenChange,
  onSuccess,
  isCurrentUser,
}: UserEditDialogProps) {
  const { toast } = useToast()
  const supabase = createClient()

  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<UserRole>(user.role)
  const [locationId, setLocationId] = useState<string>(user.location_id || '')
  const [isSaving, setIsSaving] = useState(false)

  // Group locations by type for better UX
  const hqLocations = locations.filter((l) => l.location_type === 'HQ')
  const branchLocations = locations.filter((l) => l.location_type === 'Branch')
  const subBranchLocations = locations.filter((l) => l.location_type === 'SubBranch')

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      })
      return
    }

    // Validate location assignment based on role
    if (role !== 'HQ_Admin' && !locationId) {
      toast({
        title: 'Error',
        description: 'Branch/Sub-Branch managers must be assigned to a location',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const updateData: any = {
        name: name.trim(),
        role,
        location_id: role === 'HQ_Admin' ? null : locationId || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and role assignment
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              value={user.email}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as UserRole)
                // Clear location if switching to HQ_Admin
                if (v === 'HQ_Admin') {
                  setLocationId('')
                }
              }}
              disabled={isCurrentUser} // Prevent changing own role
            >
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCurrentUser && (
              <p className="text-xs text-muted-foreground">
                You cannot change your own role
              </p>
            )}
          </div>

          {/* Location (only for non-HQ_Admin roles) */}
          {role !== 'HQ_Admin' && (
            <div className="space-y-2">
              <Label htmlFor="edit-location">Assigned Location</Label>
              <Select
                value={locationId}
                onValueChange={setLocationId}
              >
                <SelectTrigger id="edit-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {hqLocations.length > 0 && (
                    <>
                      <SelectItem value="" disabled className="font-semibold text-muted-foreground">
                        — Headquarters —
                      </SelectItem>
                      {hqLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {branchLocations.length > 0 && (
                    <>
                      <SelectItem value="" disabled className="font-semibold text-muted-foreground">
                        — Branches —
                      </SelectItem>
                      {branchLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {subBranchLocations.length > 0 && (
                    <>
                      <SelectItem value="" disabled className="font-semibold text-muted-foreground">
                        — Sub-Branches —
                      </SelectItem>
                      {subBranchLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
