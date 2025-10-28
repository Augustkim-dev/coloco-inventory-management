// Database types for Supabase
// This file defines TypeScript types for all database tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      locations: {
        Row: {
          id: string
          name: string
          location_type: 'HQ' | 'Branch'
          country_code: string
          currency: 'KRW' | 'VND' | 'CNY'
          address: string | null
          contact_person: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location_type: 'HQ' | 'Branch'
          country_code: string
          currency: 'KRW' | 'VND' | 'CNY'
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location_type?: 'HQ' | 'Branch'
          country_code?: string
          currency?: 'KRW' | 'VND' | 'CNY'
          address?: string | null
          contact_person?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          name_ko: string | null
          name_vn: string | null
          name_cn: string | null
          category: string | null
          unit: string
          shelf_life_days: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          name_ko?: string | null
          name_vn?: string | null
          name_cn?: string | null
          category?: string | null
          unit?: string
          shelf_life_days?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          name_ko?: string | null
          name_vn?: string | null
          name_cn?: string | null
          category?: string | null
          unit?: string
          shelf_life_days?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_no: string
          supplier_id: string
          order_date: string
          status: 'Draft' | 'Approved' | 'Received'
          total_amount: number
          currency: string
          notes: string | null
          created_by: string | null
          approved_by: string | null
          approved_at: string | null
          received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_no: string
          supplier_id: string
          order_date?: string
          status?: 'Draft' | 'Approved' | 'Received'
          total_amount?: number
          currency?: string
          notes?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_no?: string
          supplier_id?: string
          order_date?: string
          status?: 'Draft' | 'Approved' | 'Received'
          total_amount?: number
          currency?: string
          notes?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          po_id: string
          product_id: string
          qty: number
          unit_price: number
          total_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_id: string
          product_id: string
          qty: number
          unit_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          qty?: number
          unit_price?: number
          created_at?: string
          updated_at?: string
        }
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
          quality_status: 'OK' | 'Damaged' | 'Quarantine'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          location_id: string
          batch_no: string
          qty_on_hand?: number
          qty_reserved?: number
          unit_cost: number
          manufactured_date: string
          expiry_date: string
          quality_status?: 'OK' | 'Damaged' | 'Quarantine'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          location_id?: string
          batch_no?: string
          qty_on_hand?: number
          qty_reserved?: number
          unit_cost?: number
          manufactured_date?: string
          expiry_date?: string
          quality_status?: 'OK' | 'Damaged' | 'Quarantine'
          created_at?: string
          updated_at?: string
        }
      }
      pricing_configs: {
        Row: {
          id: string
          product_id: string
          from_location_id: string
          to_location_id: string
          purchase_price: number
          transfer_cost: number
          hq_margin_percent: number
          branch_margin_percent: number
          exchange_rate: number
          calculated_price: number | null
          final_price: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          from_location_id: string
          to_location_id: string
          purchase_price: number
          transfer_cost?: number
          hq_margin_percent?: number
          branch_margin_percent?: number
          exchange_rate: number
          calculated_price?: number | null
          final_price: number
          currency: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          from_location_id?: string
          to_location_id?: string
          purchase_price?: number
          transfer_cost?: number
          hq_margin_percent?: number
          branch_margin_percent?: number
          exchange_rate?: number
          calculated_price?: number | null
          final_price?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          location_id: string
          product_id: string
          sale_date: string
          qty: number
          unit_price: number
          total_amount: number
          currency: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          product_id: string
          sale_date?: string
          qty: number
          unit_price: number
          currency: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          product_id?: string
          sale_date?: string
          qty?: number
          unit_price?: number
          currency?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      exchange_rates: {
        Row: {
          id: string
          from_currency: 'KRW' | 'VND' | 'CNY'
          to_currency: 'KRW' | 'VND' | 'CNY'
          rate: number
          effective_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          from_currency: 'KRW' | 'VND' | 'CNY'
          to_currency: 'KRW' | 'VND' | 'CNY'
          rate: number
          effective_date?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          from_currency?: 'KRW' | 'VND' | 'CNY'
          to_currency?: 'KRW' | 'VND' | 'CNY'
          rate?: number
          effective_date?: string
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
