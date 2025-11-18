-- Migration: Extend Pricing Configs for Hierarchical Pricing
-- Description: Adds support for cascading pricing from parent to child locations
-- Date: 2025-11-18

-- Step 1: Add new columns for hierarchical pricing
ALTER TABLE public.pricing_configs
  ADD COLUMN parent_price DECIMAL(12, 2),
  ADD COLUMN is_inherited BOOLEAN DEFAULT false;

-- Step 2: Add comments
COMMENT ON COLUMN public.pricing_configs.parent_price IS 'Price from parent location (for reference when setting child location price)';
COMMENT ON COLUMN public.pricing_configs.is_inherited IS 'Whether this price is automatically inherited from parent without modification';

-- Step 3: Remove unique constraint on (product_id, to_location_id) if it's too restrictive
-- The original constraint assumed one price per product-branch pair
-- Now we need to support multiple pricing configs in the chain
-- However, we still want one price per product-location pair, so keep the constraint

-- No change needed to unique constraint - it still makes sense

-- Step 4: Create function to get pricing chain for a product at a location
CREATE OR REPLACE FUNCTION get_pricing_chain(p_product_id UUID, p_location_id UUID)
RETURNS TABLE (
  location_id UUID,
  location_name TEXT,
  location_level INTEGER,
  final_price DECIMAL(12, 2),
  currency TEXT,
  hq_margin_percent DECIMAL(5, 2),
  branch_margin_percent DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE location_path AS (
    -- Start from the target location
    SELECT l.id, l.name, l.level, l.parent_id, l.currency
    FROM public.locations l
    WHERE l.id = p_location_id

    UNION

    -- Traverse up to parent locations
    SELECT l.id, l.name, l.level, l.parent_id, l.currency
    FROM public.locations l
    INNER JOIN location_path lp ON l.id = lp.parent_id
  )
  SELECT
    lp.id,
    lp.name,
    lp.level,
    pc.final_price,
    lp.currency,
    pc.hq_margin_percent,
    pc.branch_margin_percent
  FROM location_path lp
  LEFT JOIN public.pricing_configs pc ON pc.to_location_id = lp.id AND pc.product_id = p_product_id
  ORDER BY lp.level ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_pricing_chain(UUID, UUID) IS 'Returns the pricing chain from HQ to the specified location for a product';

-- Step 5: Create function to calculate suggested price based on parent
CREATE OR REPLACE FUNCTION calculate_price_from_parent(
  p_parent_price DECIMAL(12, 2),
  p_transfer_cost DECIMAL(12, 2),
  p_exchange_rate DECIMAL(10, 4),
  p_hq_margin DECIMAL(5, 2),
  p_branch_margin DECIMAL(5, 2)
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  local_cost DECIMAL(12, 2);
  margin_factor DECIMAL(5, 4);
  calculated_price DECIMAL(12, 2);
BEGIN
  -- If parent price is in different currency, it should already be converted
  -- This function assumes parent_price + transfer_cost are in source currency

  -- Calculate local cost (convert to destination currency)
  local_cost := (p_parent_price + p_transfer_cost) * p_exchange_rate;

  -- Calculate margin factor (1 - total margin percentage)
  margin_factor := 1 - (p_hq_margin + p_branch_margin) / 100.0;

  -- Prevent division by zero or negative margin
  IF margin_factor <= 0 THEN
    RAISE EXCEPTION 'Invalid margin configuration: total margin cannot be >= 100%%';
  END IF;

  -- Calculate final price
  calculated_price := local_cost / margin_factor;

  RETURN ROUND(calculated_price, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_price_from_parent IS 'Calculates selling price based on parent location price and margins';

-- Step 6: Update RLS policies to allow Branch managers to set pricing for their children
DROP POLICY IF EXISTS pricing_configs_insert_policy ON public.pricing_configs;

CREATE POLICY pricing_configs_insert_hierarchy ON public.pricing_configs
FOR INSERT WITH CHECK (
  -- HQ Admin can insert anywhere
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Branch Manager can insert pricing for their location or child locations
  to_location_id IN (
    SELECT (SELECT location_id FROM public.users WHERE id = auth.uid())
    UNION
    SELECT location_id FROM get_child_locations((SELECT location_id FROM public.users WHERE id = auth.uid()))
  )
);

DROP POLICY IF EXISTS pricing_configs_update_policy ON public.pricing_configs;

CREATE POLICY pricing_configs_update_hierarchy ON public.pricing_configs
FOR UPDATE USING (
  -- HQ Admin can update all
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Branch Manager can update pricing for their location or child locations
  to_location_id IN (
    SELECT (SELECT location_id FROM public.users WHERE id = auth.uid())
    UNION
    SELECT location_id FROM get_child_locations((SELECT location_id FROM public.users WHERE id = auth.uid()))
  )
);
