-- Migration: Allow Branch Manager to INSERT/SELECT sales for Sub-Branches
-- Description: Updates RLS policies for sales table to allow Branch Manager access to child locations
-- Purpose: Enable Branch Manager to create and view sales at their Branch + Sub-Branches
-- Date: 2025-12-03

-- =====================================================
-- PROBLEM:
--   Branch Manager can only INSERT/SELECT sales at their own location
--   When creating sales for SubBranch, it's denied by RLS
--
-- SOLUTION:
--   Update INSERT and SELECT policies to include child locations
-- =====================================================

-- Step 1: Drop existing Branch Manager policies
DROP POLICY IF EXISTS "Branch Manager can insert own sales" ON public.sales;
DROP POLICY IF EXISTS "Branch Manager can view own sales" ON public.sales;

-- Step 2: Create new INSERT policy for Branch Manager (own + children)
CREATE POLICY "Branch Manager can insert to own and children sales"
  ON public.sales
  FOR INSERT
  WITH CHECK (
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      -- Can insert to own location
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND location_id = sales.location_id
      )
      OR
      -- Can insert to child locations (SubBranches)
      sales.location_id IN (
        SELECT location_id FROM get_child_locations(
          (SELECT location_id FROM public.users WHERE id = auth.uid())
        )
      )
    )
  );

-- Step 3: Create new SELECT policy for Branch Manager (own + children)
CREATE POLICY "Branch Manager can view own and children sales"
  ON public.sales
  FOR SELECT
  USING (
    public.get_user_role_from_jwt() = 'Branch_Manager'
    AND (
      -- Can view own location
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND location_id = sales.location_id
      )
      OR
      -- Can view child locations (SubBranches)
      sales.location_id IN (
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
    RAISE NOTICE 'Migration 029: Branch Manager SubBranch Sales';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  1. Updated INSERT policy for Branch Manager';
    RAISE NOTICE '     - Can insert sales to own location';
    RAISE NOTICE '     - Can insert sales to child locations (SubBranches)';
    RAISE NOTICE '';
    RAISE NOTICE '  2. Updated SELECT policy for Branch Manager';
    RAISE NOTICE '     - Can view sales from own location';
    RAISE NOTICE '     - Can view sales from child locations (SubBranches)';
    RAISE NOTICE '';
    RAISE NOTICE 'Use case: Branch Manager (Vietnam) can now:';
    RAISE NOTICE '  - Create sales for Ho Chi Minh, Vung Tau, Hanoi';
    RAISE NOTICE '  - View all sales from Vietnam + SubBranches';
    RAISE NOTICE '';
END $$;
