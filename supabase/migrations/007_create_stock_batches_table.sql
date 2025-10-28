-- Create stock_batches table
-- This is the core inventory tracking table with FIFO support

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

-- Enable Row Level Security
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policy: HQ Admin can view all stock
CREATE POLICY "HQ Admin can view all stock"
  ON public.stock_batches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- RLS Policy: Branch Manager can view own location stock
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

-- RLS Policy: Only HQ Admin can modify stock
CREATE POLICY "HQ Admin can modify stock"
  ON public.stock_batches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create indexes for performance (critical for FIFO and queries)
CREATE INDEX idx_stock_location_product ON public.stock_batches(location_id, product_id);
CREATE INDEX idx_stock_expiry_date ON public.stock_batches(expiry_date);
CREATE INDEX idx_stock_batch_no ON public.stock_batches(batch_no);
CREATE INDEX idx_stock_quality ON public.stock_batches(quality_status);

-- Create trigger for updated_at
CREATE TRIGGER stock_batches_updated_at
  BEFORE UPDATE ON public.stock_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
