-- Create pricing_configs table
-- This table stores pricing calculation parameters by product and destination branch

CREATE TABLE public.pricing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE, -- Always HQ
  to_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE, -- Branch
  purchase_price DECIMAL(12, 2) NOT NULL CHECK (purchase_price >= 0), -- Purchase price in KRW
  transfer_cost DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (transfer_cost >= 0), -- Transfer cost in KRW
  hq_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (hq_margin_percent >= 0 AND hq_margin_percent < 100), -- HQ margin %
  branch_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (branch_margin_percent >= 0 AND branch_margin_percent < 100), -- Branch margin %
  exchange_rate DECIMAL(10, 4) NOT NULL CHECK (exchange_rate > 0), -- Exchange rate
  calculated_price DECIMAL(12, 2), -- Auto-calculated price
  final_price DECIMAL(12, 2) NOT NULL CHECK (final_price > 0), -- Final selling price (manually adjustable)
  currency TEXT NOT NULL, -- 'VND', 'CNY'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, to_location_id)
);

-- Enable Row Level Security
ALTER TABLE public.pricing_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only HQ Admin can view pricing configs
CREATE POLICY "HQ Admin can view pricing configs"
  ON public.pricing_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- RLS Policy: Only HQ Admin can modify pricing configs
CREATE POLICY "HQ Admin can modify pricing configs"
  ON public.pricing_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create index for product-location lookups
CREATE INDEX idx_pricing_product_location ON public.pricing_configs(product_id, to_location_id);

-- Create trigger for updated_at
CREATE TRIGGER pricing_configs_updated_at
  BEFORE UPDATE ON public.pricing_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
