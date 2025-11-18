// Database types
// This file should be generated using: npx supabase gen types typescript --local > types/database.ts
// For now, we're using a minimal type definition

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          location_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      locations: {
        Row: {
          id: string
          name: string
          location_type: string
          country_code: string
          address: string | null
          currency: string
          timezone: string
          parent_location_id: string | null
          level: number
          path: string | null
          display_order: number
          is_active: boolean
          contact_person: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'id' | 'created_at' | 'updated_at' | 'level' | 'path' | 'display_order'> & {
          parent_location_id?: string | null
          display_order?: number
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['locations']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          business_registration_no: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          name_ko: string | null
          name_vn: string | null
          name_cn: string | null
          category: string
          unit: string
          shelf_life_days: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      supplier_products: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['supplier_products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['supplier_products']['Insert']>
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          supplier_id: string
          location_id: string
          order_date: string
          expected_delivery_date: string | null
          status: string
          total_amount: number
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchase_orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchase_order_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['purchase_order_items']['Insert']>
      }
      stock_batches: {
        Row: {
          id: string
          product_id: string
          location_id: string
          batch_no: string
          qty_on_hand: number
          qty_reserved: number
          qty_available: number
          unit_cost: number
          manufactured_date: string
          expiry_date: string
          quality_status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['stock_batches']['Row'], 'id' | 'qty_available' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['stock_batches']['Insert']>
      }
      pricing_configs: {
        Row: {
          id: string
          product_id: string
          from_location_id: string
          to_location_id: string
          purchase_price: number
          transfer_cost: number
          exchange_rate: number
          hq_margin_percent: number
          branch_margin_percent: number
          calculated_price: number
          final_price: number
          effective_date: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pricing_configs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['pricing_configs']['Insert']>
      }
      sales: {
        Row: {
          id: string
          location_id: string
          product_id: string
          sale_date: string
          quantity: number
          unit_price: number
          total_amount: number
          channel: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sales']['Insert']>
      }
      exchange_rates: {
        Row: {
          id: string
          from_currency: string
          to_currency: string
          rate: number
          effective_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['exchange_rates']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['exchange_rates']['Insert']>
      }
    }
    Views: {}
    Functions: {
      get_available_stock: {
        Args: {
          p_location_id: string
          p_product_id: string
        }
        Returns: number
      }
    }
    Enums: {}
  }
}
