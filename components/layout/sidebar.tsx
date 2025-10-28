"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navItems } from "@/lib/constants"
import { LogoutButton } from "@/components/auth/logout-button"
import { cn } from "@/lib/utils"
import { UserRole } from "@/types"

interface SidebarProps {
  userRole: UserRole
  userName: string
  userEmail: string
}

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b border-gray-800 px-6">
        <h1 className="text-xl font-bold">Arno Inventory</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              {Icon && <Icon className="mr-3 h-5 w-5" />}
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-gray-800 p-4">
        <div className="mb-2 rounded-md bg-gray-800 p-3">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-gray-400">{userEmail}</p>
          <p className="mt-1 text-xs text-gray-500">
            Role: {userRole.replace("_", " ")}
          </p>
        </div>
        <LogoutButton />
      </div>
    </div>
  )
}
