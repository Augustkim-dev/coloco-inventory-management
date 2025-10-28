import { Database } from './database'

// User roles
export type UserRole = 'HQ_Admin' | 'Branch_Manager'

// Location types
export type LocationType = 'HQ' | 'Branch'

// Currency types
export type Currency = 'KRW' | 'VND' | 'CNY'

// Purchase order status
export type POStatus = 'Draft' | 'Approved' | 'Received'

// Quality status
export type QualityStatus = 'OK' | 'Damaged' | 'Quarantine'

// Unit types
export type Unit = 'EA' | 'BOX' | 'PACK'

// Database table type aliases
export type Location = Database['public']['Tables']['locations']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
export type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row']
export type StockBatch = Database['public']['Tables']['stock_batches']['Row']
export type PricingConfig = Database['public']['Tables']['pricing_configs']['Row']
export type Sale = Database['public']['Tables']['sales']['Row']
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']

// Insert types
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
export type ProductInsert = Database['public']['Tables']['products']['Insert']

// Update types
export type LocationUpdate = Database['public']['Tables']['locations']['Update']
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

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
