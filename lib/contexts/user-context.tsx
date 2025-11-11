"use client"

import { createContext, useContext } from "react"

export interface UserData {
  id: string
  email: string
  name: string
  role: "HQ_Admin" | "Branch_Manager"
  location_id: string | null
  preferred_language: string
}

const UserContext = createContext<UserData | null>(null)

export function UserProvider({
  children,
  userData,
}: {
  children: React.ReactNode
  userData: UserData
}) {
  return <UserContext.Provider value={userData}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }
  return context
}
