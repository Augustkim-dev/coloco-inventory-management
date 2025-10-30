-- Create supplier_products junction table
-- This table establishes many-to-many relationship between suppliers and products
-- One supplier can provide multiple products, one product can be supplied by multiple suppliers

CREATE TABLE public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Business information
  supplier_product_code TEXT, -- Supplier's own SKU/code for this product
  unit_price DECIMAL(12, 2), -- Supplier's price (in KRW)
  lead_time_days INTEGER DEFAULT 7, -- Days from order to delivery
  minimum_order_qty INTEGER DEFAULT 1, -- Minimum order quantity
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

-- Enable Row Level Security
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view supplier-product relationships
CREATE POLICY "Authenticated users can view supplier products"
  ON public.supplier_products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only HQ Admin can modify supplier-product relationships
CREATE POLICY "HQ Admin can modify supplier products"
  ON public.supplier_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_supplier_products_supplier_id ON public.supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product_id ON public.supplier_products(product_id);
CREATE INDEX idx_supplier_products_is_primary ON public.supplier_products(is_primary_supplier) WHERE is_primary_supplier = true;
CREATE INDEX idx_supplier_products_is_active ON public.supplier_products(is_active) WHERE is_active = true;

-- Create trigger for updated_at
CREATE TRIGGER supplier_products_updated_at
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.supplier_products IS 'Junction table linking suppliers to products they can provide, with supplier-specific pricing and terms';
