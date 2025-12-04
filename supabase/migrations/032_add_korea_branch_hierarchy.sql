-- Migration: Add Korea Branch Hierarchy
-- Description: Creates Korea Branch with 5 Sub-branches (Naver, Coupang, Instagram, Seoul, Busan) under HQ
-- Date: 2025-12-04

-- Step 1: Add KRW -> KRW exchange rate (rate = 1)
-- This is needed for pricing configs targeting Korea Branch (same currency, no conversion)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date, notes)
VALUES ('KRW', 'KRW', 1.0, CURRENT_DATE, 'Korea domestic - no currency conversion')
ON CONFLICT (from_currency, to_currency, effective_date) DO NOTHING;

-- Step 2: Insert Korea Branch (Level 2, under HQ)
INSERT INTO public.locations (
  id, name, location_type, country_code, currency,
  level, parent_id, path, display_order, is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Korea',
  'Branch',
  'KR',
  'KRW',
  2,
  '00000000-0000-0000-0000-000000000001',  -- HQ parent_id
  '/HQ/Korea',
  10,
  true
);

-- Step 3: Insert 5 Korea Sub-branches (Level 3, under Korea Branch)
-- Online channels: Naver, Coupang, Instagram
-- Offline locations: Seoul, Busan
INSERT INTO public.locations (
  id, name, location_type, country_code, currency,
  level, parent_id, path, display_order, is_active
)
VALUES
  -- Online Channels
  ('00000000-0000-0000-0000-000000000011', 'Naver', 'SubBranch', 'KR', 'KRW', 3,
   '00000000-0000-0000-0000-000000000010', '/HQ/Korea/Naver', 11, true),
  ('00000000-0000-0000-0000-000000000012', 'Coupang', 'SubBranch', 'KR', 'KRW', 3,
   '00000000-0000-0000-0000-000000000010', '/HQ/Korea/Coupang', 12, true),
  ('00000000-0000-0000-0000-000000000013', 'Instagram', 'SubBranch', 'KR', 'KRW', 3,
   '00000000-0000-0000-0000-000000000010', '/HQ/Korea/Instagram', 13, true),
  -- Offline Locations
  ('00000000-0000-0000-0000-000000000014', 'Seoul', 'SubBranch', 'KR', 'KRW', 3,
   '00000000-0000-0000-0000-000000000010', '/HQ/Korea/Seoul', 14, true),
  ('00000000-0000-0000-0000-000000000015', 'Busan', 'SubBranch', 'KR', 'KRW', 3,
   '00000000-0000-0000-0000-000000000010', '/HQ/Korea/Busan', 15, true);

-- Step 4: Verification
DO $$
DECLARE
  korea_branch_count INTEGER;
  korea_subbranch_count INTEGER;
  total_locations INTEGER;
BEGIN
  SELECT COUNT(*) INTO korea_branch_count
  FROM public.locations
  WHERE name = 'Korea' AND location_type = 'Branch';

  SELECT COUNT(*) INTO korea_subbranch_count
  FROM public.locations
  WHERE parent_id = '00000000-0000-0000-0000-000000000010';

  SELECT COUNT(*) INTO total_locations
  FROM public.locations;

  RAISE NOTICE '';
  RAISE NOTICE '=== Korea Branch Hierarchy Created ===';
  RAISE NOTICE 'Korea Branch created: %', korea_branch_count;
  RAISE NOTICE 'Korea Sub-branches created: %', korea_subbranch_count;
  RAISE NOTICE 'Total locations: %', total_locations;
  RAISE NOTICE '';
  RAISE NOTICE 'Structure:';
  RAISE NOTICE '  Korea HQ';
  RAISE NOTICE '  ├── Korea (Branch)';
  RAISE NOTICE '  │   ├── Naver (SubBranch - Online)';
  RAISE NOTICE '  │   ├── Coupang (SubBranch - Online)';
  RAISE NOTICE '  │   ├── Instagram (SubBranch - SNS)';
  RAISE NOTICE '  │   ├── Seoul (SubBranch - Offline)';
  RAISE NOTICE '  │   └── Busan (SubBranch - Offline)';
  RAISE NOTICE '  ├── Vietnam (Branch)';
  RAISE NOTICE '  └── China (Branch)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create Korea Branch Manager account in Supabase Auth';
  RAISE NOTICE '2. Assign Branch_Manager role with location_id = Korea Branch';
  RAISE NOTICE '3. Set up pricing configs for Korea Branch products';
  RAISE NOTICE '4. Transfer stock from HQ to Korea Branch';
END $$;
