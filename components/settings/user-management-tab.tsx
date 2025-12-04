'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Location, UserRole } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { UserEditDialog } from './user-edit-dialog'
import { Edit, UserX, UserCheck, Users } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UserManagementTabProps {
  users: User[]
  locations: Location[]
  currentUserId: string
}

const ROLE_LABELS: Record<string, string> = {
  HQ_Admin: 'HQ Admin',
  Branch_Manager: 'Branch Manager',
  SubBranch_Manager: 'Sub-Branch Manager',
}

const ROLE_COLORS: Record<string, string> = {
  HQ_Admin: 'bg-purple-100 text-purple-800',
  Branch_Manager: 'bg-blue-100 text-blue-800',
  SubBranch_Manager: 'bg-green-100 text-green-800',
}

export function UserManagementTab({ users, locations, currentUserId }: UserManagementTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [statusChangeUser, setStatusChangeUser] = useState<User | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Create location lookup map
  const locationMap = new Map(locations.map((l) => [l.id, l]))

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return '-'
    const location = locationMap.get(locationId)
    return location?.name || 'Unknown'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleStatusChange = async () => {
    if (!statusChangeUser) return

    // Prevent self-deactivation
    if (statusChangeUser.id === currentUserId) {
      toast({
        title: 'Error',
        description: 'You cannot deactivate your own account',
        variant: 'destructive',
      })
      setStatusChangeUser(null)
      return
    }

    // Check if this is the last admin
    const activeAdmins = users.filter(
      (u) => u.role === 'HQ_Admin' && u.id !== statusChangeUser.id
    )
    if (statusChangeUser.role === 'HQ_Admin' && activeAdmins.length === 0) {
      toast({
        title: 'Error',
        description: 'Cannot deactivate the last HQ Admin account',
        variant: 'destructive',
      })
      setStatusChangeUser(null)
      return
    }

    setIsUpdating(true)
    try {
      // For now, we'll use a simple approach - in production you might want to use
      // Supabase Admin API or a custom RPC function
      // Here we'll toggle a hypothetical is_active field or use a workaround

      // Since we don't have is_active in the schema yet, we'll show a message
      // In real implementation, you would:
      // 1. Add is_active column to users table
      // 2. Or use Supabase Auth Admin API to disable the user

      toast({
        title: 'Info',
        description: 'User status change feature requires additional setup. Please contact administrator.',
      })

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
      setStatusChangeUser(null)
    }
  }

  const handleUserUpdated = () => {
    setEditingUser(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Accounts
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and assigned locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name}
                        {user.id === currentUserId && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[user.role] || 'bg-gray-100'}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{getLocationName(user.location_id)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <UserEditDialog
          user={editingUser}
          locations={locations}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onSuccess={handleUserUpdated}
          isCurrentUser={editingUser.id === currentUserId}
        />
      )}

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={!!statusChangeUser} onOpenChange={(open) => !open && setStatusChangeUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of {statusChangeUser?.name}?
              This action can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={isUpdating}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
