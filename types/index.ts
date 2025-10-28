// User roles
export type UserRole = 'HQ_Admin' | 'Branch_Manager'

// Location types
export type LocationType = 'HQ' | 'Branch'

// User type
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  location_id: string | null
  created_at: string
  updated_at: string
}

// Auth types
export interface AuthError {
  message: string
  status?: number
}

// Navigation item type
export interface NavItem {
  title: string
  href: string
  icon?: any
  roles: UserRole[]
}
