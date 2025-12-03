-- Migration: Create Pricing Templates System
-- Description: Adds support for category-based pricing templates with bulk apply functionality
-- Date: 2024-12-03

-- Step 1: Create pricing_templates table
CREATE TABLE IF NOT EXISTS public.pricing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Target filter
  category TEXT,                                    -- nullable = all categories
  target_currency TEXT NOT NULL,                    -- 'VND', 'CNY' (target currency for exchange rate)

  -- Margin settings
  hq_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 10,
  branch_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 30,

  -- Cost settings
  default_transfer_cost DECIMAL(12,2) DEFAULT 0,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_hq_margin CHECK (hq_margin_percent >= 0 AND hq_margin_percent < 100),
  CONSTRAINT valid_branch_margin CHECK (branch_margin_percent >= 0 AND branch_margin_percent < 100),
  CONSTRAINT valid_total_margin CHECK (hq_margin_percent + branch_margin_percent < 100),
  CONSTRAINT valid_transfer_cost CHECK (default_transfer_cost >= 0),
  CONSTRAINT valid_currency CHECK (target_currency IN ('VND', 'CNY', 'KRW'))
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_templates_category ON public.pricing_templates(category);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_currency ON public.pricing_templates(target_currency);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_active ON public.pricing_templates(is_active);

-- Step 3: Add comments
COMMENT ON TABLE public.pricing_templates IS 'Stores pricing templates for bulk price configuration';
COMMENT ON COLUMN public.pricing_templates.category IS 'Product category filter (null = all categories)';
COMMENT ON COLUMN public.pricing_templates.target_currency IS 'Target currency for price calculation (VND, CNY)';
COMMENT ON COLUMN public.pricing_templates.hq_margin_percent IS 'HQ margin percentage (0-99)';
COMMENT ON COLUMN public.pricing_templates.branch_margin_percent IS 'Branch margin percentage (0-99)';
COMMENT ON COLUMN public.pricing_templates.default_transfer_cost IS 'Default transfer cost in KRW';

-- Step 4: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_pricing_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_templates_updated_at ON public.pricing_templates;
CREATE TRIGGER pricing_templates_updated_at
  BEFORE UPDATE ON public.pricing_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_templates_updated_at();

-- Step 5: Create pricing_template_applications table (for tracking apply history)
CREATE TABLE IF NOT EXISTS public.pricing_template_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.pricing_templates(id) ON DELETE SET NULL,
  applied_by UUID REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ DEFAULT NOW(),

  -- Application scope
  target_location_ids UUID[] NOT NULL,
  product_filter JSONB,                            -- {category?: string, product_ids?: string[]}

  -- Settings at time of application
  exchange_rate DECIMAL(10,4) NOT NULL,
  exchange_rate_id UUID REFERENCES public.exchange_rates(id),

  -- Results
  products_affected INTEGER NOT NULL DEFAULT 0,
  configs_created INTEGER NOT NULL DEFAULT 0,
  configs_updated INTEGER NOT NULL DEFAULT 0
);

-- Step 6: Create indexes for applications table
CREATE INDEX IF NOT EXISTS idx_template_applications_template ON public.pricing_template_applications(template_id);
CREATE INDEX IF NOT EXISTS idx_template_applications_applied_by ON public.pricing_template_applications(applied_by);
CREATE INDEX IF NOT EXISTS idx_template_applications_applied_at ON public.pricing_template_applications(applied_at);

-- Step 7: Enable RLS
ALTER TABLE public.pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_template_applications ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for pricing_templates
-- HQ Admin can do everything
CREATE POLICY "HQ Admin full access to pricing_templates"
  ON public.pricing_templates
  FOR ALL
  USING (public.get_user_role_from_jwt() = 'HQ_Admin')
  WITH CHECK (public.get_user_role_from_jwt() = 'HQ_Admin');

-- All authenticated users can view active templates
CREATE POLICY "Authenticated users can view active templates"
  ON public.pricing_templates
  FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- Step 9: Create RLS policies for pricing_template_applications
-- HQ Admin can do everything
CREATE POLICY "HQ Admin full access to template_applications"
  ON public.pricing_template_applications
  FOR ALL
  USING (public.get_user_role_from_jwt() = 'HQ_Admin')
  WITH CHECK (public.get_user_role_from_jwt() = 'HQ_Admin');

-- All authenticated users can view applications
CREATE POLICY "Authenticated users can view applications"
  ON public.pricing_template_applications
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Step 10: Create helper function to calculate price from template
CREATE OR REPLACE FUNCTION calculate_template_price(
  p_purchase_price DECIMAL(12, 2),
  p_transfer_cost DECIMAL(12, 2),
  p_exchange_rate DECIMAL(10, 4),
  p_hq_margin DECIMAL(5, 2),
  p_branch_margin DECIMAL(5, 2),
  p_target_currency TEXT
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  local_cost DECIMAL(12, 2);
  margin_factor DECIMAL(5, 4);
  calculated_price DECIMAL(12, 2);
  rounded_price DECIMAL(12, 2);
BEGIN
  -- Calculate local cost (convert to destination currency)
  local_cost := (p_purchase_price + p_transfer_cost) * p_exchange_rate;

  -- Calculate margin factor (1 - total margin percentage)
  margin_factor := 1 - (p_hq_margin + p_branch_margin) / 100.0;

  -- Prevent division by zero or negative margin
  IF margin_factor <= 0 THEN
    RAISE EXCEPTION 'Invalid margin configuration: total margin cannot be >= 100%%';
  END IF;

  -- Calculate final price
  calculated_price := local_cost / margin_factor;

  -- Round based on currency
  CASE p_target_currency
    WHEN 'VND' THEN
      -- Round to nearest 1000
      rounded_price := ROUND(calculated_price / 1000) * 1000;
    WHEN 'CNY' THEN
      -- Round to 2 decimal places
      rounded_price := ROUND(calculated_price, 2);
    WHEN 'KRW' THEN
      -- Round to nearest 100
      rounded_price := ROUND(calculated_price / 100) * 100;
    ELSE
      rounded_price := ROUND(calculated_price, 2);
  END CASE;

  RETURN rounded_price;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_template_price IS 'Calculates selling price based on template settings with currency-specific rounding';

-- Step 11: Grant permissions
GRANT SELECT ON public.pricing_templates TO authenticated;
GRANT ALL ON public.pricing_templates TO service_role;
GRANT SELECT ON public.pricing_template_applications TO authenticated;
GRANT ALL ON public.pricing_template_applications TO service_role;
