-- Migration: Add Location Hierarchy Support
-- Description: Adds parent-child relationship to locations table for unlimited depth hierarchy
-- Date: 2025-11-18

-- Step 1: Add hierarchy columns to locations table
ALTER TABLE public.locations
  ADD COLUMN parent_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  ADD COLUMN level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN path TEXT,
  ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Step 2: Add indexes for hierarchy queries
CREATE INDEX idx_locations_parent_id ON public.locations(parent_id);
CREATE INDEX idx_locations_level ON public.locations(level);
CREATE INDEX idx_locations_path ON public.locations USING btree(path);
CREATE INDEX idx_locations_active ON public.locations(is_active) WHERE is_active = true;

-- Step 3: Update location_type constraint to include SubBranch
ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_location_type_check;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_location_type_check
  CHECK (location_type IN ('HQ', 'Branch', 'SubBranch'));

-- Step 4: Add constraint to ensure HQ has no parent
ALTER TABLE public.locations
  ADD CONSTRAINT check_hq_no_parent
  CHECK (
    (location_type = 'HQ' AND parent_id IS NULL AND level = 1) OR
    (location_type != 'HQ')
  );

-- Step 5: Add constraint for path format validation
ALTER TABLE public.locations
  ADD CONSTRAINT check_path_format
  CHECK (path IS NULL OR path ~ '^/[A-Za-z0-9_/]+$');

-- Step 6: Add comment for documentation
COMMENT ON COLUMN public.locations.parent_id IS 'Parent location ID for hierarchical structure. NULL for HQ.';
COMMENT ON COLUMN public.locations.level IS 'Hierarchy level: 1=HQ, 2=Branch, 3+=SubBranch';
COMMENT ON COLUMN public.locations.path IS 'Materialized path for efficient queries: /HQ/Vietnam/Ho_Chi_Minh';
COMMENT ON COLUMN public.locations.is_active IS 'Whether this location is currently active';

-- Step 7: Create helper function to get all child locations (recursive)
CREATE OR REPLACE FUNCTION get_child_locations(parent_location_id UUID)
RETURNS TABLE (location_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE children AS (
    -- Base case: direct children
    SELECT id FROM public.locations WHERE parent_id = parent_location_id
    UNION
    -- Recursive case: children of children
    SELECT l.id
    FROM public.locations l
    INNER JOIN children c ON l.parent_id = c.id
  )
  SELECT id FROM children;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_child_locations(UUID) IS 'Returns all descendant location IDs for a given parent location';

-- Step 8: Create helper function to get all parent locations (ancestors)
CREATE OR REPLACE FUNCTION get_ancestor_locations(child_location_id UUID)
RETURNS TABLE (location_id UUID, location_level INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    -- Base case: the location itself
    SELECT id, level FROM public.locations WHERE id = child_location_id
    UNION
    -- Recursive case: parent of current
    SELECT l.id, l.level
    FROM public.locations l
    INNER JOIN ancestors a ON l.id = (SELECT parent_id FROM public.locations WHERE id = a.location_id)
  )
  SELECT location_id, location_level FROM ancestors WHERE location_id != child_location_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_ancestor_locations(UUID) IS 'Returns all ancestor location IDs for a given location';

-- Step 9: Create function to check if transfer is valid (parent-child relationship)
CREATE OR REPLACE FUNCTION can_transfer_between(from_location_id UUID, to_location_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  from_parent UUID;
  to_parent UUID;
  from_level INTEGER;
  to_level INTEGER;
BEGIN
  -- Get location details
  SELECT parent_id, level INTO from_parent, from_level
  FROM public.locations WHERE id = from_location_id;

  SELECT parent_id, level INTO to_parent, to_level
  FROM public.locations WHERE id = to_location_id;

  -- Same location
  IF from_location_id = to_location_id THEN
    RETURN false;
  END IF;

  -- Parent to direct child (forward)
  IF to_parent = from_location_id THEN
    RETURN true;
  END IF;

  -- Child to direct parent (reverse)
  IF from_parent = to_location_id THEN
    RETURN true;
  END IF;

  -- All other cases are invalid (siblings, skip-level, etc.)
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_transfer_between(UUID, UUID) IS 'Checks if stock transfer is allowed between two locations (must be direct parent-child)';

-- Step 10: Update RLS policy for stock_batches to support hierarchy
-- Drop existing policy
DROP POLICY IF EXISTS stock_batches_select_policy ON public.stock_batches;

-- Create new policy that allows viewing own location + all child locations
CREATE POLICY stock_batches_select_hierarchy ON public.stock_batches
FOR SELECT USING (
  -- HQ Admin can see all
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Branch Manager can see their location + all children
  location_id IN (
    SELECT (SELECT location_id FROM public.users WHERE id = auth.uid())
    UNION
    SELECT location_id FROM get_child_locations((SELECT location_id FROM public.users WHERE id = auth.uid()))
  )
  OR
  -- SubBranch Manager can see only their location
  (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'SubBranch_Manager'
    AND location_id = (SELECT location_id FROM public.users WHERE id = auth.uid())
  )
);

-- Step 11: Update RLS policy for sales to support SubBranch_Manager
DROP POLICY IF EXISTS sales_select_policy ON public.sales;

CREATE POLICY sales_select_hierarchy ON public.sales
FOR SELECT USING (
  -- HQ Admin can see all
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Branch Manager can see their location + all children
  location_id IN (
    SELECT (SELECT location_id FROM public.users WHERE id = auth.uid())
    UNION
    SELECT location_id FROM get_child_locations((SELECT location_id FROM public.users WHERE id = auth.uid()))
  )
  OR
  -- SubBranch Manager can see only their location
  (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'SubBranch_Manager'
    AND location_id = (SELECT location_id FROM public.users WHERE id = auth.uid())
  )
);

-- Insert policy for SubBranch_Manager
DROP POLICY IF EXISTS sales_insert_policy ON public.sales;

CREATE POLICY sales_insert_hierarchy ON public.sales
FOR INSERT WITH CHECK (
  -- HQ Admin can insert anywhere
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Branch Manager can insert to their location + children
  location_id IN (
    SELECT (SELECT location_id FROM public.users WHERE id = auth.uid())
    UNION
    SELECT location_id FROM get_child_locations((SELECT location_id FROM public.users WHERE id = auth.uid()))
  )
  OR
  -- SubBranch Manager can insert only to their location
  (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'SubBranch_Manager'
    AND location_id = (SELECT location_id FROM public.users WHERE id = auth.uid())
  )
);
