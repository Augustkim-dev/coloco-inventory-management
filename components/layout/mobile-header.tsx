"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";

/**
 * Mobile header component
 * Displayed only on mobile devices (< 768px)
 * Contains hamburger menu button, logo, and user info
 */
export function MobileHeader() {
  const t = useTranslations("common");
  const { open } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-gray-800 border-b shadow-sm md:hidden">
      <div className="flex items-center justify-between h-full px-4">
        {/* Hamburger Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={open}
          aria-label={t("mobile.openMenu")}
          className="h-10 w-10"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Logo/Brand */}
        <div className="flex-1 text-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Arno Cosmetics
          </span>
        </div>

        {/* Spacer to balance layout */}
        <div className="w-10" />
      </div>
    </header>
  );
}
