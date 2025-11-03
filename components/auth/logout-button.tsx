"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoutButtonProps {
  fullWidth?: boolean
}

export function LogoutButton({ fullWidth = true }: LogoutButtonProps) {
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
      className={cn(
        "justify-start",
        fullWidth ? "w-full" : "w-auto"
      )}
    >
      <LogOut className={cn("h-4 w-4", fullWidth && "mr-2")} />
      {fullWidth && "Logout"}
    </Button>
  )
}
