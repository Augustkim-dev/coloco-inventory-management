-- Create sales table
-- This table stores sales transactions by branch

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

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- RLS Policy: HQ Admin can view all sales
CREATE POLICY "HQ Admin can view all sales"
  ON public.sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- RLS Policy: Branch Manager can view own sales
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

-- RLS Policy: Branch Manager can insert own sales
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

-- RLS Policy: HQ Admin can modify all sales
CREATE POLICY "HQ Admin can modify sales"
  ON public.sales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_sales_location_date ON public.sales(location_id, sale_date);
CREATE INDEX idx_sales_product ON public.sales(product_id);

-- Create trigger for updated_at
CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
