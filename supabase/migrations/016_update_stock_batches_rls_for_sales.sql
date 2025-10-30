-- Update RLS policy for stock_batches to allow Branch Managers to update stock when making sales
-- This is needed for the sales module where Branch Managers need to deduct inventory

-- Drop existing UPDATE/DELETE policy for HQ Admin
DROP POLICY IF EXISTS "HQ Admin can modify stock" ON public.stock_batches;

-- Create new policy: HQ Admin can do everything
CREATE POLICY "HQ Admin can modify stock"
  ON public.stock_batches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create new policy: Branch Manager can update stock quantities for their location (for sales)
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

-- Note: Branch Managers can only UPDATE (for sales deductions)
-- They cannot INSERT or DELETE stock_batches
