-- =====================================================
-- Arno Cosmetics Global Inventory & Sales Management System
-- Complete Database Rebuild Script
-- =====================================================
--
-- PURPOSE:
--   This script drops all existing tables and recreates the entire database
--   from scratch for production deployment. It consolidates all migrations
--   (001-017) into a single, clean SQL file.
--
-- USAGE:
--   Execute this script in Supabase SQL Editor to rebuild the database.
--   WARNING: This will DELETE ALL EXISTING DATA. Backup first if needed!
--
-- WHAT THIS SCRIPT DOES:
--   1. Drops all existing tables, functions, and policies
--   2. Creates 11 core tables with complete schema
--   3. Creates 2 database functions
--   4. Enables Row Level Security on all tables
--   5. Creates 25 RLS policies for access control
--   6. Inserts initial data (3 locations + 2 exchange rates)
--
-- CREATED: 2025-10-31
-- BASED ON: Migrations 001-017
-- =====================================================


-- =====================================================
-- SECTION 1: DROP ALL EXISTING OBJECTS
-- =====================================================
-- Drop all tables in reverse dependency order to avoid FK constraint errors
-- Using CASCADE to automatically drop dependent objects (triggers, indexes, policies)

DO $$
BEGIN
    -- Drop tables in reverse dependency order
    DROP TABLE IF EXISTS public.sales CASCADE;
    DROP TABLE IF EXISTS public.pricing_configs CASCADE;
    DROP TABLE IF EXISTS public.stock_batches CASCADE;
    DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
    DROP TABLE IF EXISTS public.purchase_orders CASCADE;
    DROP TABLE IF EXISTS public.supplier_products CASCADE;
    DROP TABLE IF EXISTS public.exchange_rates CASCADE;
    DROP TABLE IF EXISTS public.products CASCADE;
    DROP TABLE IF EXISTS public.suppliers CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
    DROP TABLE IF EXISTS public.locations CASCADE;

    -- Drop functions
    DROP FUNCTION IF EXISTS public.get_available_stock(UUID, UUID);
    DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

    RAISE NOTICE 'All existing tables and functions dropped successfully.';
END $$;


-- =====================================================
-- SECTION 2: CREATE TABLES
-- =====================================================

-- -----------------------------------------------------
-- 2.1 Create update_updated_at_column() function FIRST
-- (Required by all table triggers)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates updated_at timestamp on row update';


-- -----------------------------------------------------
-- 2.1.2 Create get_current_user_role() function
-- (Required by users table RLS policies to avoid infinite recursion)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with the privileges of the function owner (bypasses RLS)
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role directly without triggering RLS
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  RETURN user_role;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS 'Returns the role of the currently authenticated user, bypassing RLS to avoid infinite recursion';


-- -----------------------------------------------------
-- 2.2 locations - HQ and branch locations
-- -----------------------------------------------------
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('HQ', 'Branch')),
  country_code TEXT NOT NULL, -- 'KR', 'VN', 'CN'
  currency TEXT NOT NULL CHECK (currency IN ('KRW', 'VND', 'CNY')),
  address TEXT,
  contact_person TEXT,
  phone TEXT,
  display_order INTEGER NOT NULL, -- For UI ordering (1=first, 2=second, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_locations_type ON public.locations(location_type);
CREATE INDEX idx_locations_country ON public.locations(country_code);
CREATE INDEX idx_locations_display_order ON public.locations(display_order);

-- Trigger
CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.locations IS 'Headquarters and branch locations (Korea HQ, Vietnam Branch, China Branch)';
COMMENT ON COLUMN public.locations.display_order IS 'Display order in UI. Used for sorting locations in Inventory Kanban View and other lists.';


-- -----------------------------------------------------
-- 2.3 users - User authentication and role management
-- -----------------------------------------------------
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('HQ_Admin', 'Branch_Manager')),
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ko', 'vi', 'zh')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_location ON public.users(location_id);
CREATE INDEX idx_users_preferred_language ON public.users(preferred_language);

-- Trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.users IS 'User accounts with role-based access control (HQ_Admin, Branch_Manager)';
COMMENT ON COLUMN public.users.preferred_language IS 'User preferred UI language: en (English), ko (Korean), vi (Vietnamese), zh (Chinese)';


-- -----------------------------------------------------
-- 2.4 suppliers - Factory/supplier information
-- -----------------------------------------------------
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suppliers_name ON public.suppliers(name);

-- Trigger
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.suppliers IS 'Factory suppliers who provide products to Korea HQ';


-- -----------------------------------------------------
-- 2.5 products - Product master data
-- -----------------------------------------------------
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ko TEXT, -- Korean name (for multilingual support)
  name_vn TEXT, -- Vietnamese name
  name_cn TEXT, -- Chinese name
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'EA', -- 'EA', 'BOX', 'PACK'
  shelf_life_days INTEGER NOT NULL DEFAULT 730, -- Shelf life in days
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);

-- Trigger
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.products IS 'Product master data with SKU, names, category, and shelf life';


-- -----------------------------------------------------
-- 2.6 supplier_products - Supplier-Product junction table (Many-to-Many)
-- -----------------------------------------------------
CREATE TABLE public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Business information
  supplier_product_code TEXT, -- Supplier's own SKU/code for this product
  unit_price DECIMAL(12, 2), -- Supplier's price (in KRW)
  lead_time_days INTEGER DEFAULT 7, -- Days from order to delivery
  minimum_order_qty INTEGER DEFAULT 1, -- Minimum order quantity (MOQ)
  is_primary_supplier BOOLEAN DEFAULT false, -- Is this the primary/preferred supplier?

  -- Status
  is_active BOOLEAN DEFAULT true, -- Can we currently order from this supplier?

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one supplier-product pair exists only once
  UNIQUE(supplier_id, product_id)
);

-- Indexes
CREATE INDEX idx_supplier_products_supplier_id ON public.supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product_id ON public.supplier_products(product_id);
CREATE INDEX idx_supplier_products_is_primary ON public.supplier_products(is_primary_supplier) WHERE is_primary_supplier = true;
CREATE INDEX idx_supplier_products_is_active ON public.supplier_products(is_active) WHERE is_active = true;

-- Trigger
CREATE TRIGGER supplier_products_updated_at
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.supplier_products IS 'Junction table linking suppliers to products they can provide, with supplier-specific pricing and terms';


-- -----------------------------------------------------
-- 2.7 purchase_orders - Purchase orders from HQ to suppliers
-- -----------------------------------------------------
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Received')),
  total_amount DECIMAL(15, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE INDEX idx_po_order_date ON public.purchase_orders(order_date);

-- Trigger
CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.purchase_orders IS 'Purchase orders from Korea HQ to factory suppliers';


-- -----------------------------------------------------
-- 2.8 purchase_order_items - Line items for purchase orders
-- -----------------------------------------------------
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(15, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(po_id, product_id)
);

-- Indexes
CREATE INDEX idx_po_items_po_id ON public.purchase_order_items(po_id);
CREATE INDEX idx_po_items_product_id ON public.purchase_order_items(product_id);

-- Trigger
CREATE TRIGGER purchase_order_items_updated_at
  BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.purchase_order_items IS 'Line items for each purchase order';


-- -----------------------------------------------------
-- 2.9 stock_batches - Core inventory tracking with FIFO support
-- -----------------------------------------------------
CREATE TABLE public.stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  batch_no TEXT NOT NULL,
  qty_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  qty_reserved INTEGER NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  qty_available INTEGER GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  unit_cost DECIMAL(12, 2) NOT NULL CHECK (unit_cost >= 0),
  manufactured_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quality_status TEXT NOT NULL DEFAULT 'OK' CHECK (quality_status IN ('OK', 'Damaged', 'Quarantine')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_id, batch_no),
  CHECK (expiry_date > manufactured_date)
);

-- Indexes (critical for FIFO and inventory queries)
CREATE INDEX idx_stock_location_product ON public.stock_batches(location_id, product_id);
CREATE INDEX idx_stock_expiry_date ON public.stock_batches(expiry_date);
CREATE INDEX idx_stock_batch_no ON public.stock_batches(batch_no);
CREATE INDEX idx_stock_quality ON public.stock_batches(quality_status);

-- Trigger
CREATE TRIGGER stock_batches_updated_at
  BEFORE UPDATE ON public.stock_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.stock_batches IS 'Inventory tracking by batch with FIFO support. Each receipt creates a new batch.';


-- -----------------------------------------------------
-- 2.10 pricing_configs - Price calculation parameters
-- -----------------------------------------------------
CREATE TABLE public.pricing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE, -- Always HQ
  to_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE, -- Branch
  purchase_price DECIMAL(12, 2) NOT NULL CHECK (purchase_price >= 0), -- Purchase price in KRW
  transfer_cost DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (transfer_cost >= 0), -- Transfer cost in KRW
  hq_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (hq_margin_percent >= 0 AND hq_margin_percent < 100),
  branch_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (branch_margin_percent >= 0 AND branch_margin_percent < 100),
  exchange_rate DECIMAL(10, 4) NOT NULL CHECK (exchange_rate > 0),
  calculated_price DECIMAL(12, 2), -- Auto-calculated price
  final_price DECIMAL(12, 2) NOT NULL CHECK (final_price > 0), -- Final selling price (manually adjustable)
  currency TEXT NOT NULL, -- 'VND', 'CNY'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, to_location_id)
);

-- Indexes
CREATE INDEX idx_pricing_product_location ON public.pricing_configs(product_id, to_location_id);

-- Trigger
CREATE TRIGGER pricing_configs_updated_at
  BEFORE UPDATE ON public.pricing_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.pricing_configs IS 'Price calculation parameters by product and destination branch';


-- -----------------------------------------------------
-- 2.11 sales - Sales transactions by branch
-- -----------------------------------------------------
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price > 0),
  total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  currency TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sales_location_date ON public.sales(location_id, sale_date);
CREATE INDEX idx_sales_product ON public.sales(product_id);

-- Trigger
CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.sales IS 'Sales transactions recorded by branch managers';


-- -----------------------------------------------------
-- 2.12 exchange_rates - Currency exchange rates
-- -----------------------------------------------------
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL CHECK (from_currency IN ('KRW', 'VND', 'CNY')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('KRW', 'VND', 'CNY')),
  rate DECIMAL(10, 4) NOT NULL CHECK (rate > 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT, -- Optional notes about exchange rate changes
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, effective_date)
);

-- Indexes
CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(effective_date DESC);

-- Trigger
CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.exchange_rates IS 'Currency exchange rates (manual entry in MVP, historical tracking)';


-- =====================================================
-- SECTION 3: CREATE FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- 3.1 get_available_stock() - Calculate available stock
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_available_stock(
  p_location_id UUID,
  p_product_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(qty_available), 0)::INTEGER
    FROM public.stock_batches
    WHERE location_id = p_location_id
      AND product_id = p_product_id
      AND quality_status = 'OK'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_available_stock(UUID, UUID) IS 'Returns total available stock (qty_available) for a product at a specific location, excluding damaged or quarantined items';


-- =====================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 5: CREATE RLS POLICIES (25 Total)
-- =====================================================

-- -----------------------------------------------------
-- 5.1 users table (4 policies)
-- -----------------------------------------------------

-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- HQ_Admin can view all users (using helper function to avoid infinite recursion)
CREATE POLICY "HQ_Admin can view all users"
  ON public.users
  FOR SELECT
  USING (
    public.get_current_user_role() = 'HQ_Admin'
  );

-- HQ_Admin can insert users (using helper function to avoid infinite recursion)
CREATE POLICY "HQ_Admin can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'HQ_Admin'
  );

-- HQ_Admin can update users (using helper function to avoid infinite recursion)
CREATE POLICY "HQ_Admin can update users"
  ON public.users
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'HQ_Admin'
  );

-- Users can update own profile (for preferred_language, etc.)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- -----------------------------------------------------
-- 5.2 locations table (2 policies)
-- -----------------------------------------------------

-- Authenticated users can view locations
CREATE POLICY "Authenticated users can view locations"
  ON public.locations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- HQ Admin can modify locations
CREATE POLICY "HQ Admin can modify locations"
  ON public.locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.3 suppliers table (2 policies)
-- -----------------------------------------------------

-- Authenticated users can view suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- HQ Admin can modify suppliers
CREATE POLICY "HQ Admin can modify suppliers"
  ON public.suppliers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.4 products table (2 policies)
-- -----------------------------------------------------

-- Authenticated users can view products
CREATE POLICY "Authenticated users can view products"
  ON public.products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- HQ Admin can modify products
CREATE POLICY "HQ Admin can modify products"
  ON public.products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.5 supplier_products table (2 policies)
-- -----------------------------------------------------

-- Authenticated users can view supplier products
CREATE POLICY "Authenticated users can view supplier products"
  ON public.supplier_products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- HQ Admin can modify supplier products
CREATE POLICY "HQ Admin can modify supplier products"
  ON public.supplier_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.6 purchase_orders table (2 policies)
-- -----------------------------------------------------

-- HQ Admin can view purchase orders
CREATE POLICY "HQ Admin can view purchase orders"
  ON public.purchase_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- HQ Admin can modify purchase orders
CREATE POLICY "HQ Admin can modify purchase orders"
  ON public.purchase_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.7 purchase_order_items table (2 policies)
-- -----------------------------------------------------

-- HQ Admin can view PO items
CREATE POLICY "HQ Admin can view PO items"
  ON public.purchase_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- HQ Admin can modify PO items
CREATE POLICY "HQ Admin can modify PO items"
  ON public.purchase_order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.8 stock_batches table (4 policies)
-- -----------------------------------------------------

-- HQ Admin can view all stock
CREATE POLICY "HQ Admin can view all stock"
  ON public.stock_batches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Branch Manager can view own location stock
CREATE POLICY "Branch Manager can view own location stock"
  ON public.stock_batches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'Branch_Manager'
        AND location_id = stock_batches.location_id
    )
  );

-- HQ Admin can modify stock (INSERT/UPDATE/DELETE)
CREATE POLICY "HQ Admin can modify stock"
  ON public.stock_batches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Branch Manager can update own location stock (for sales deductions)
CREATE POLICY "Branch Manager can update own location stock"
  ON public.stock_batches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'Branch_Manager'
        AND location_id = stock_batches.location_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'Branch_Manager'
        AND location_id = stock_batches.location_id
    )
  );


-- -----------------------------------------------------
-- 5.9 pricing_configs table (2 policies)
-- -----------------------------------------------------

-- HQ Admin can view all, Branch Manager can view their location's prices
CREATE POLICY "Users can view pricing configs for their location"
  ON public.pricing_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND (
        role = 'HQ_Admin'
        OR (role = 'Branch_Manager' AND location_id = pricing_configs.to_location_id)
      )
    )
  );

-- HQ Admin can modify pricing configs
CREATE POLICY "HQ Admin can modify pricing configs"
  ON public.pricing_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.10 sales table (4 policies)
-- -----------------------------------------------------

-- HQ Admin can view all sales
CREATE POLICY "HQ Admin can view all sales"
  ON public.sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Branch Manager can view own sales
CREATE POLICY "Branch Manager can view own sales"
  ON public.sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'Branch_Manager'
        AND location_id = sales.location_id
    )
  );

-- Branch Manager can insert own sales
CREATE POLICY "Branch Manager can insert own sales"
  ON public.sales
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'Branch_Manager'
        AND location_id = sales.location_id
    )
  );

-- HQ Admin can modify all sales
CREATE POLICY "HQ Admin can modify sales"
  ON public.sales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- -----------------------------------------------------
-- 5.11 exchange_rates table (2 policies)
-- -----------------------------------------------------

-- Authenticated users can view exchange rates
CREATE POLICY "Authenticated users can view exchange rates"
  ON public.exchange_rates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- HQ Admin can modify exchange rates
CREATE POLICY "HQ Admin can modify exchange rates"
  ON public.exchange_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );


-- =====================================================
-- SECTION 6: INSERT INITIAL DATA
-- =====================================================

-- -----------------------------------------------------
-- 6.1 Insert locations (3 locations: HQ + 2 branches)
-- -----------------------------------------------------
INSERT INTO public.locations (name, location_type, country_code, currency, address, display_order) VALUES
('Korea HQ', 'HQ', 'KR', 'KRW', 'Seoul, South Korea', 1),
('Vietnam Branch', 'Branch', 'VN', 'VND', 'Ho Chi Minh City, Vietnam', 2),
('China Branch', 'Branch', 'CN', 'CNY', 'Shanghai, China', 3);


-- -----------------------------------------------------
-- 6.2 Insert exchange rates (2 initial rates)
-- -----------------------------------------------------
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date, notes) VALUES
('KRW', 'VND', 18.0, CURRENT_DATE, 'Initial exchange rate for Vietnam operations'),
('KRW', 'CNY', 0.0053, CURRENT_DATE, 'Initial exchange rate for China operations');


-- =====================================================
-- SCRIPT COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database rebuild completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - 11 tables created';
    RAISE NOTICE '  - 2 functions created';
    RAISE NOTICE '  - 25 RLS policies created';
    RAISE NOTICE '  - 3 locations inserted';
    RAISE NOTICE '  - 2 exchange rates inserted';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Create first HQ_Admin user in Supabase Auth';
    RAISE NOTICE '  2. Insert user record in public.users table';
    RAISE NOTICE '  3. Start using the application!';
    RAISE NOTICE '';
END $$;
