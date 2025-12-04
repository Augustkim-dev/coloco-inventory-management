import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { SidebarProvider } from "@/hooks/use-sidebar"
import { UserProvider } from "@/lib/contexts/user-context"
import { getAuthUser, getUserProfile } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use cached auth helpers - these are deduplicated across the request
  const user = await getAuthUser()

  if (!user) {
    redirect("/login")
  }

  // Use cached profile helper - reuses the auth check from above
  const userData = await getUserProfile()

  if (!userData) {
    // User exists in auth but not in public.users table
    redirect("/login")
  }

  return (
    <UserProvider userData={userData}>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Mobile Header - visible only on mobile */}
          <MobileHeader />

          {/* Sidebar - drawer on mobile, fixed on desktop */}
          <Sidebar
            userRole={userData.role}
            userName={userData.name}
            userEmail={userData.email}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            {/* Add top padding on mobile for fixed header */}
            <div className="pt-16 md:pt-0 p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </UserProvider>
  )
}
