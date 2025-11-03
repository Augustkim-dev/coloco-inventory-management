"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { navItems } from "@/lib/constants"
import { LogoutButton } from "@/components/auth/logout-button"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { cn } from "@/lib/utils"
import { UserRole } from "@/types"
import { useSidebar } from "@/hooks/use-sidebar"
import { useIsMobile } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface SidebarProps {
  userRole: UserRole
  userName: string
  userEmail: string
}

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('navigation.menu')
  const tCommon = useTranslations('common')
  const { isOpen, isCollapsed, close, toggleCollapse } = useSidebar()
  const isMobile = useIsMobile()

  // Navigation title mapping
  const navTitleMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/locations': 'locations',
    '/suppliers': 'suppliers',
    '/products': 'products',
    '/purchase-orders': 'purchaseOrders',
    '/inventory': 'inventory',
    '/exchange-rates': 'exchangeRates',
    '/pricing': 'pricingConfig',
    '/sales': 'sales',
    '/reports': 'reports',
    '/settings': 'settings',
  }

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  // Sidebar content (shared between mobile drawer and desktop sidebar)
  const sidebarContent = (
    <div className="flex h-full flex-col bg-gray-900 text-white">
      {/* Logo/Brand */}
      <div className={cn(
        "flex h-16 items-center border-b border-gray-800 transition-all duration-200",
        isCollapsed ? "justify-center px-2" : "px-6"
      )}>
        {isCollapsed ? (
          <span className="text-xl font-bold">AC</span>
        ) : (
          <h1 className="text-xl font-bold">{tCommon('appName')}</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const translationKey = navTitleMap[item.href] || item.title

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isMobile ? close : undefined}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? t(translationKey) : undefined}
            >
              {Icon && <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />}
              {!isCollapsed && <span>{t(translationKey)}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Language Switcher, User Info & Logout */}
      <div className="border-t border-gray-800 p-4 space-y-3">
        {/* Desktop Collapse Toggle Button */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="w-full text-gray-300 hover:text-white hover:bg-gray-800"
            title={isCollapsed ? tCommon('sidebar.expand') : tCommon('sidebar.collapse')}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                {tCommon('sidebar.collapse')}
              </>
            )}
          </Button>
        )}

        {/* Language Switcher */}
        {!isCollapsed && (
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>
        )}

        {/* User Info */}
        {!isCollapsed && (
          <div className="rounded-md bg-gray-800 p-3">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-gray-400">{userEmail}</p>
            <p className="mt-1 text-xs text-gray-500">
              Role: {userRole.replace("_", " ")}
            </p>
          </div>
        )}

        {/* Logout Button */}
        <LogoutButton fullWidth={!isCollapsed} />
      </div>
    </div>
  )

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{tCommon('mobile.menu')}</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Fixed sidebar with collapse
  return (
    <aside
      className={cn(
        "flex-shrink-0 transition-all duration-200",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {sidebarContent}
    </aside>
  )
}
