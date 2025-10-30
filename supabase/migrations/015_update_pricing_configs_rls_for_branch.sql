-- Update RLS policy for pricing_configs to allow Branch Managers to view prices
-- This is needed for the sales module where Branch Managers need to see prices

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "HQ Admin can view pricing configs" ON public.pricing_configs;

-- Create new policy: HQ Admin can view all, Branch Manager can view their location's prices
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

-- Keep the modify policy as HQ Admin only
-- (The existing policy "HQ Admin can modify pricing configs" remains unchanged)
