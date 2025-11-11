import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { SidebarProvider } from "@/hooks/use-sidebar"
import { UserProvider } from "@/lib/contexts/user-context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch user data from public.users table (optimized: select only needed columns)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, name, role, location_id, preferred_language")
    .eq("id", user.id)
    .single()

  console.log('[DASHBOARD LAYOUT] User ID:', user.id)
  console.log('[DASHBOARD LAYOUT] User data:', userData)
  console.log('[DASHBOARD LAYOUT] Error:', userError)

  if (!userData) {
    // User exists in auth but not in public.users table
    // For now, redirect to login. In production, you might want to handle this differently
    console.log('[DASHBOARD LAYOUT] No user data found, redirecting to /login')
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
