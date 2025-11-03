"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface SidebarContextType {
  isOpen: boolean
  isCollapsed: boolean
  open: () => void
  close: () => void
  toggle: () => void
  collapse: () => void
  expand: () => void
  toggleCollapse: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const STORAGE_KEY = "sidebar-state"

interface SidebarState {
  isCollapsed: boolean
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const state: SidebarState = JSON.parse(stored)
        setIsCollapsed(state.isCollapsed)
      }
    } catch (error) {
      console.error("Failed to load sidebar state:", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const state: SidebarState = { isCollapsed }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error("Failed to save sidebar state:", error)
    }
  }, [isCollapsed])

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen((prev) => !prev)
  const collapse = () => setIsCollapsed(true)
  const expand = () => setIsCollapsed(false)
  const toggleCollapse = () => setIsCollapsed((prev) => !prev)

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        open,
        close,
        toggle,
        collapse,
        expand,
        toggleCollapse,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
