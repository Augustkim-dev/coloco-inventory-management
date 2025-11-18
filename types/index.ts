import { Database } from './database'

// User roles
export type UserRole = 'HQ_Admin' | 'Branch_Manager' | 'SubBranch_Manager'

// Location types
export type LocationType = 'HQ' | 'Branch' | 'SubBranch'

// Currency types
export type Currency = 'KRW' | 'VND' | 'CNY'

// Language types
export type Language = 'en' | 'ko' | 'vi' | 'zh'

// Purchase order status
export type POStatus = 'Draft' | 'Approved' | 'Received'

// Quality status
export type QualityStatus = 'OK' | 'Damaged' | 'Quarantine'

// Unit types
export type Unit = 'EA' | 'BOX' | 'PACK'

// Database table type aliases with hierarchy fields
export type Location = Database['public']['Tables']['locations']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
export type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row']
export type StockBatch = Database['public']['Tables']['stock_batches']['Row']
export type PricingConfig = Database['public']['Tables']['pricing_configs']['Row']
export type Sale = Database['public']['Tables']['sales']['Row']
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']

// Stock Transfer Request type (manually defined until DB types are regenerated)
export interface StockTransferRequest {
  id: string
  from_location_id: string
  to_location_id: string
  product_id: string
  requested_qty: number
  requested_by: string
  approved_by?: string | null
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed'
  notes?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
  approved_at?: string | null
}

// Supplier Product type (manually defined)
export interface SupplierProduct {
  id: string
  supplier_id: string
  product_id: string
  supplier_product_code: string | null
  unit_price: number | null
  lead_time_days: number | null
  minimum_order_qty: number | null
  is_primary_supplier: boolean | null
  is_active: boolean | null
  notes: string | null
  created_at: string
  updated_at: string
}

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
  preferred_language: Language
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

// ============================================
// Hierarchical Location Types
// ============================================

// Location with hierarchy information
export interface LocationWithHierarchy extends Location {
  children?: LocationWithHierarchy[]
  parent?: Location | null
}

// Location tree node for UI rendering
export interface LocationTreeNode {
  id: string
  name: string
  location_type: LocationType
  level: number
  parent_id: string | null
  path: string
  display_order: number
  currency: Currency
  country_code: string
  is_active: boolean
  children: LocationTreeNode[]
}

// Location breadcrumb for navigation
export interface LocationBreadcrumb {
  id: string
  name: string
  level: number
}

// ============================================
// Stock Transfer Request Types
// ============================================

// Transfer request status
export type TransferRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed'

// Transfer request with related data
export interface TransferRequestWithDetails extends StockTransferRequest {
  from_location?: Location
  to_location?: Location
  product?: Product
  requested_by_user?: User
  approved_by_user?: User | null
}

// Transfer request insert type
export interface TransferRequestInsert {
  from_location_id: string
  to_location_id: string
  product_id: string
  requested_qty: number
  notes?: string
}

// ============================================
// Pricing Chain Types
// ============================================

// Single node in pricing chain
export interface PriceNode {
  location_id: string
  location_name: string
  location_level: number
  final_price: number | null
  currency: Currency
  hq_margin_percent: number | null
  branch_margin_percent: number | null
}

// Complete pricing chain from HQ to target location
export interface PricingChain {
  product_id: string
  target_location_id: string
  chain: PriceNode[]
}

// Price calculation parameters
export interface PriceCalculationParams {
  parent_price: number
  transfer_cost: number
  exchange_rate: number
  hq_margin: number
  branch_margin: number
}

// Price calculation result
export interface PriceCalculationResult {
  local_cost: number
  calculated_price: number
  suggested_final_price: number
  total_margin_percent: number
}
