-- Migration: Add Branch Manager RLS policies for locations table
-- This allows Branch Managers to create and update locations under their branch

-- ============================================
-- Branch Manager INSERT policy
-- Allows Branch Managers to create SubBranches under their own branch
-- ============================================
CREATE POLICY "Branch Manager can create sub-branches"
  ON public.locations
  FOR INSERT
  WITH CHECK (
    -- User must be a Branch Manager
    public.get_user_role_from_jwt() = 'Branch_Manager'
    -- Location type must be SubBranch
    AND location_type = 'SubBranch'
    -- Parent must be the Branch Manager's own location
    AND parent_id = (
      SELECT location_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- Branch Manager UPDATE policy
-- Allows Branch Managers to update their own branch or sub-branches under it
-- ============================================
CREATE POLICY "Branch Manager can update own locations"
  ON public.locations
  FOR UPDATE
  USING (
    -- User must be a Branch Manager
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      -- Can update their own branch
      id = (
        SELECT location_id FROM public.users
        WHERE id = auth.uid()
      )
      -- Or can update sub-branches under their branch
      OR (
        parent_id = (
          SELECT location_id FROM public.users
          WHERE id = auth.uid()
        )
        AND location_type = 'SubBranch'
      )
    )
  )
  WITH CHECK (
    -- Same conditions for the new row
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      id = (
        SELECT location_id FROM public.users
        WHERE id = auth.uid()
      )
      OR (
        parent_id = (
          SELECT location_id FROM public.users
          WHERE id = auth.uid()
        )
        AND location_type = 'SubBranch'
      )
    )
  );

-- ============================================
-- Branch Manager DELETE policy
-- Allows Branch Managers to delete sub-branches under their own branch
-- (Cannot delete their own branch)
-- ============================================
CREATE POLICY "Branch Manager can delete sub-branches"
  ON public.locations
  FOR DELETE
  USING (
    -- User must be a Branch Manager
    public.get_user_role_from_jwt() = 'Branch_Manager'
    -- Can only delete sub-branches under their branch (not their own branch)
    AND parent_id = (
      SELECT location_id FROM public.users
      WHERE id = auth.uid()
    )
    AND location_type = 'SubBranch'
  );
