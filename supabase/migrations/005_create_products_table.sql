-- Create products table
-- This table stores product master data

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ko TEXT, -- Korean name (for future multilingual support)
  name_vn TEXT, -- Vietnamese name
  name_cn TEXT, -- Chinese name
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'EA', -- 'EA', 'BOX', 'PACK'
  shelf_life_days INTEGER NOT NULL DEFAULT 730, -- Shelf life in days
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view products
CREATE POLICY "Authenticated users can view products"
  ON public.products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only HQ Admin can modify products
CREATE POLICY "HQ Admin can modify products"
  ON public.products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);

-- Create trigger for updated_at
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
