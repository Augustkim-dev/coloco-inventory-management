-- =====================================================
-- Phase 12: Sync User Roles to JWT app_metadata
-- =====================================================
--
-- PURPOSE:
--   Update all existing users' JWT app_metadata with their roles
--   This enables the optimized RLS policies from migration 021
--
-- WHAT THIS DOES:
--   - Reads role from public.users table
--   - Updates auth.users.raw_app_meta_data with user_role
--   - All users will have role in JWT on next login
--
-- CREATED: 2025-11-11
-- REQUIRES: Migration 021 (RLS optimization)
-- =====================================================


-- Update all existing users' app_metadata with their roles
UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  COALESCE(au.raw_app_meta_data, '{}'::jsonb),
  '{user_role}',
  to_jsonb(u.role)
)
FROM public.users u
WHERE au.id = u.id;


-- Verification query (shows what was updated)
DO $$
DECLARE
  updated_count INTEGER;
  admin_count INTEGER;
  manager_count INTEGER;
BEGIN
  -- Count total updated users
  SELECT COUNT(*) INTO updated_count
  FROM auth.users au
  JOIN public.users u ON au.id = u.id
  WHERE au.raw_app_meta_data ? 'user_role';

  -- Count by role
  SELECT COUNT(*) INTO admin_count
  FROM auth.users au
  WHERE au.raw_app_meta_data->>'user_role' = 'HQ_Admin';

  SELECT COUNT(*) INTO manager_count
  FROM auth.users au
  WHERE au.raw_app_meta_data->>'user_role' = 'Branch_Manager';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'JWT app_metadata Sync Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated users: %', updated_count;
  RAISE NOTICE '  - HQ_Admin: %', admin_count;
  RAISE NOTICE '  - Branch_Manager: %', manager_count;
  RAISE NOTICE '';
  RAISE NOTICE 'What happened:';
  RAISE NOTICE '  - All users now have "user_role" in their JWT';
  RAISE NOTICE '  - Users need to logout and login again for changes to take effect';
  RAISE NOTICE '  - After re-login, performance will be significantly improved';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Ask all users to logout and login again';
  RAISE NOTICE '  2. Or wait for JWT tokens to expire (default: 1 hour)';
  RAISE NOTICE '  3. Test performance improvements in browser DevTools';
  RAISE NOTICE '';
END $$;
