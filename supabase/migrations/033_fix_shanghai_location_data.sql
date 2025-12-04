-- Migration: Fix ShangHai location data
-- ShangHai has incorrect level (1 instead of 3) and null path
-- This causes it to appear at the top of the inventory list

UPDATE public.locations
SET
  level = 3,
  path = '/HQ/China/ShangHai'
WHERE id = '8dd7d4f0-3938-4007-b5c3-9179d37cfe2f'
  AND name = 'ShangHai';

-- Verify the update
-- SELECT id, name, location_type, level, path, parent_id
-- FROM public.locations
-- WHERE parent_id = '00000000-0000-0000-0000-000000000003';
