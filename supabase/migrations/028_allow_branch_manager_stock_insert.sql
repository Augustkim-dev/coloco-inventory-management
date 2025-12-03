-- Migration: Allow Branch Manager to INSERT stock_batches for Sub-Branches
-- Description: Adds RLS policy for Branch Manager to INSERT stock at their location + all child locations
-- Purpose: Enable Branch → SubBranch stock transfers by Branch Manager
-- Date: 2025-12-03

-- =====================================================
-- PROBLEM:
--   Branch Manager can only UPDATE stock at their own location
--   When transferring to SubBranch, INSERT is needed but denied by RLS
--   Error: "new row violates row-level security policy for table stock_batches"
--
-- SOLUTION:
--   Add INSERT policy for Branch Manager to insert into:
--   1. Their own location
--   2. All child locations (SubBranches under their Branch)
-- =====================================================

-- Step 1: Add INSERT policy for Branch Manager
CREATE POLICY "Branch Manager can insert to own location and children"
  ON public.stock_batches
  FOR INSERT
  WITH CHECK (
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      -- Can insert to own location
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND location_id = stock_batches.location_id
      )
      OR
      -- Can insert to child locations (SubBranches)
      stock_batches.location_id IN (
        SELECT location_id FROM get_child_locations(
          (SELECT location_id FROM public.users WHERE id = auth.uid())
        )
      )
    )
  );

-- Step 2: Update existing UPDATE policy to also allow updating SubBranch stock
-- First, drop the existing UPDATE policy
DROP POLICY IF EXISTS "Branch Manager can update own location stock" ON public.stock_batches;

-- Recreate with expanded permissions (own location + children)
CREATE POLICY "Branch Manager can update own location and children stock"
  ON public.stock_batches
  FOR UPDATE
  USING (
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      -- Can update own location
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND location_id = stock_batches.location_id
      )
      OR
      -- Can update child locations (SubBranches)
      stock_batches.location_id IN (
        SELECT location_id FROM get_child_locations(
          (SELECT location_id FROM public.users WHERE id = auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      -- Can update own location
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND location_id = stock_batches.location_id
      )
      OR
      -- Can update child locations (SubBranches)
      stock_batches.location_id IN (
        SELECT location_id FROM get_child_locations(
          (SELECT location_id FROM public.users WHERE id = auth.uid())
        )
      )
    )
  );

-- Step 3: Update SELECT policy for Branch Manager to view SubBranch stock
-- First, drop the existing SELECT policy if it conflicts
DROP POLICY IF EXISTS "Branch Manager can view own location stock" ON public.stock_batches;

-- Recreate with expanded permissions (own location + children)
CREATE POLICY "Branch Manager can view own location and children stock"
  ON public.stock_batches
  FOR SELECT
  USING (
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      -- Can view own location
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND location_id = stock_batches.location_id
      )
      OR
      -- Can view child locations (SubBranches)
      stock_batches.location_id IN (
        SELECT location_id FROM get_child_locations(
          (SELECT location_id FROM public.users WHERE id = auth.uid())
        )
      )
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 028: Branch Manager Stock Insert';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  1. Added INSERT policy for Branch Manager';
    RAISE NOTICE '     - Can insert to own location';
    RAISE NOTICE '     - Can insert to all child locations (SubBranches)';
    RAISE NOTICE '';
    RAISE NOTICE '  2. Updated UPDATE policy for Branch Manager';
    RAISE NOTICE '     - Now includes child locations';
    RAISE NOTICE '';
    RAISE NOTICE '  3. Updated SELECT policy for Branch Manager';
    RAISE NOTICE '     - Now includes child locations';
    RAISE NOTICE '';
    RAISE NOTICE 'Use case: Branch Manager can now transfer stock';
    RAISE NOTICE '  from their Branch to SubBranches';
    RAISE NOTICE '';
END $$;
