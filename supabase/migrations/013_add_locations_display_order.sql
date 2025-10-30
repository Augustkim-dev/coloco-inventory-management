-- Migration: Add display_order column to locations table
-- Purpose: Allow custom ordering of locations in UI
-- Date: 2025-01-XX

-- Step 1: Add display_order column (nullable initially)
ALTER TABLE public.locations
ADD COLUMN display_order INTEGER;

-- Step 2: Set initial values based on desired order
-- Korea HQ: 1, Vietnam Branch: 2, China Branch: 3
UPDATE public.locations
SET display_order = CASE
  WHEN location_type = 'HQ' THEN 1
  WHEN country_code = 'VN' THEN 2
  WHEN country_code = 'CN' THEN 3
  ELSE (
    -- For any future branches, auto-assign next available number
    SELECT COALESCE(MAX(display_order), 0) + 1
    FROM public.locations
    WHERE display_order IS NOT NULL
  )
END;

-- Step 3: Make display_order NOT NULL after setting values
ALTER TABLE public.locations
ALTER COLUMN display_order SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX idx_locations_display_order
ON public.locations(display_order);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN public.locations.display_order
IS 'Display order in UI (1=first, 2=second, etc.). Used for sorting locations in Inventory Kanban View and other lists.';
