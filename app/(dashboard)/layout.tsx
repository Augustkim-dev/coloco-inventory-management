import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"

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

  // Fetch user data from public.users table
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!userData) {
    // User exists in auth but not in public.users table
    // For now, redirect to login. In production, you might want to handle this differently
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={userData.role}
        userName={userData.name}
        userEmail={userData.email}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
    </div>
  )
}
