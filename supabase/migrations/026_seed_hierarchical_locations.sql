-- Migration: Seed Hierarchical Location Data
-- Description: Creates initial location hierarchy with HQ, Branches, and Sub-Branches
-- Date: 2025-11-18

-- WARNING: This will delete all existing data and recreate locations with hierarchy

-- Step 1: Clear existing data (in reverse dependency order)
DELETE FROM public.sales;
DELETE FROM public.stock_batches;
DELETE FROM public.pricing_configs;
DELETE FROM public.purchase_order_items;
DELETE FROM public.purchase_orders;
DELETE FROM public.stock_transfer_requests;

-- Don't delete users yet - we'll update their location_id references

-- Step 2: Delete existing locations
DELETE FROM public.locations;

-- Step 3: Insert new hierarchical locations

-- Level 1: HQ
INSERT INTO public.locations (id, name, location_type, country_code, currency, level, parent_id, path, display_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Korea HQ', 'HQ', 'KR', 'KRW', 1, NULL, '/HQ', 1, true);

-- Level 2: Main Branches
INSERT INTO public.locations (id, name, location_type, country_code, currency, level, parent_id, path, display_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Vietnam', 'Branch', 'VN', 'VND', 2, '00000000-0000-0000-0000-000000000001', '/HQ/Vietnam', 2, true),
  ('00000000-0000-0000-0000-000000000003', 'China', 'Branch', 'CN', 'CNY', 2, '00000000-0000-0000-0000-000000000001', '/HQ/China', 6, true);

-- Level 3: Vietnam Sub-Branches
INSERT INTO public.locations (id, name, location_type, country_code, currency, level, parent_id, path, display_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000004', 'Ho Chi Minh', 'SubBranch', 'VN', 'VND', 3, '00000000-0000-0000-0000-000000000002', '/HQ/Vietnam/Ho_Chi_Minh', 3, true),
  ('00000000-0000-0000-0000-000000000005', 'Vung Tau', 'SubBranch', 'VN', 'VND', 3, '00000000-0000-0000-0000-000000000002', '/HQ/Vietnam/Vung_Tau', 4, true),
  ('00000000-0000-0000-0000-000000000006', 'Hanoi', 'SubBranch', 'VN', 'VND', 3, '00000000-0000-0000-0000-000000000002', '/HQ/Vietnam/Hanoi', 5, true);

-- Level 3: China Sub-Branches
INSERT INTO public.locations (id, name, location_type, country_code, currency, level, parent_id, path, display_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000007', 'Wei Hai', 'SubBranch', 'CN', 'CNY', 3, '00000000-0000-0000-0000-000000000003', '/HQ/China/Wei_Hai', 7, true),
  ('00000000-0000-0000-0000-000000000008', 'Guangzhou', 'SubBranch', 'CN', 'CNY', 3, '00000000-0000-0000-0000-000000000003', '/HQ/China/Guangzhou', 8, true);

-- Step 4: Update users table to add SubBranch_Manager role if it doesn't exist
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('HQ_Admin', 'Branch_Manager', 'SubBranch_Manager'));

-- Step 5: Update existing users or create sample users
-- Note: Adjust user IDs based on your auth.users table

-- Clear existing location assignments
UPDATE public.users SET location_id = NULL;

-- If you want to create sample users, uncomment below:
-- Note: These users must exist in auth.users first (created via Supabase Auth)

/*
-- Sample HQ Admin
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000001', role = 'HQ_Admin'
WHERE email = 'admin@hq.com';

-- Sample Vietnam Branch Manager
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000002', role = 'Branch_Manager'
WHERE email = 'manager@vietnam.com';

-- Sample Ho Chi Minh SubBranch Manager
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000004', role = 'SubBranch_Manager'
WHERE email = 'manager@hcm.com';

-- Sample Vung Tau SubBranch Manager
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000005', role = 'SubBranch_Manager'
WHERE email = 'manager@vungtau.com';

-- Sample Hanoi SubBranch Manager
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000006', role = 'SubBranch_Manager'
WHERE email = 'manager@hanoi.com';

-- Sample China Branch Manager
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000003', role = 'Branch_Manager'
WHERE email = 'manager@china.com';

-- Sample Wei Hai SubBranch Manager
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000007', role = 'SubBranch_Manager'
WHERE email = 'manager@weihai.com';

-- Sample Guangzhou SubBranch Manager
UPDATE public.users
SET location_id = '00000000-0000-0000-0000-000000000008', role = 'SubBranch_Manager'
WHERE email = 'manager@guangzhou.com';
*/

-- Step 6: Verify the hierarchy
DO $$
DECLARE
  location_count INTEGER;
  hq_count INTEGER;
  branch_count INTEGER;
  subbranch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO location_count FROM public.locations;
  SELECT COUNT(*) INTO hq_count FROM public.locations WHERE level = 1;
  SELECT COUNT(*) INTO branch_count FROM public.locations WHERE level = 2;
  SELECT COUNT(*) INTO subbranch_count FROM public.locations WHERE level = 3;

  RAISE NOTICE 'Location Hierarchy Created:';
  RAISE NOTICE '  Total Locations: %', location_count;
  RAISE NOTICE '  HQ (Level 1): %', hq_count;
  RAISE NOTICE '  Branches (Level 2): %', branch_count;
  RAISE NOTICE '  Sub-Branches (Level 3): %', subbranch_count;

  -- Verify parent-child relationships
  RAISE NOTICE '';
  RAISE NOTICE 'Hierarchy Structure:';
  FOR rec IN
    SELECT
      REPEAT('  ', l.level - 1) || l.name AS indented_name,
      l.level,
      l.location_type,
      l.path
    FROM public.locations l
    ORDER BY l.path
  LOOP
    RAISE NOTICE '%', rec.indented_name || ' (Level ' || rec.level || ', ' || rec.location_type || ')';
  END LOOP;
END $$;

-- Step 7: Insert sample exchange rates (if table exists)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date)
VALUES
  ('KRW', 'VND', 18.0, CURRENT_DATE),
  ('KRW', 'CNY', 0.0052, CURRENT_DATE),
  ('VND', 'KRW', 0.0556, CURRENT_DATE),
  ('CNY', 'KRW', 192.3, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, effective_date)
DO UPDATE SET
  rate = EXCLUDED.rate,
  updated_at = NOW();

RAISE NOTICE '';
RAISE NOTICE '✓ Hierarchical location structure created successfully!';
RAISE NOTICE '✓ 1 HQ, 2 Branches, 6 Sub-Branches';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Create users in Supabase Auth UI';
RAISE NOTICE '2. Uncomment and run the user assignment section above';
RAISE NOTICE '3. Start creating products, suppliers, and inventory';
