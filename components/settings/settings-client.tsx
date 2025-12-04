'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Location } from '@/types'
import { MyAccountTab } from './my-account-tab'
import { UserManagementTab } from './user-management-tab'
import { User as UserIcon, Users, Settings } from 'lucide-react'

interface SettingsClientProps {
  currentUser: User
  currentUserLocationName: string | null
  allUsers: User[]
  locations: Location[]
}

export function SettingsClient({
  currentUser,
  currentUserLocationName,
  allUsers,
  locations,
}: SettingsClientProps) {
  const isAdmin = currentUser.role === 'HQ_Admin'

  return (
    <Tabs defaultValue="my-account" className="w-full">
      <TabsList className="grid w-full max-w-md" style={{ gridTemplateColumns: isAdmin ? 'repeat(2, 1fr)' : '1fr' }}>
        <TabsTrigger value="my-account" className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          My Account
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="user-management" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="my-account" className="mt-6">
        <MyAccountTab
          user={currentUser}
          locationName={currentUserLocationName}
        />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="user-management" className="mt-6">
          <UserManagementTab
            users={allUsers}
            locations={locations}
            currentUserId={currentUser.id}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}
