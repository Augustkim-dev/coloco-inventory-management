"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  )
}
