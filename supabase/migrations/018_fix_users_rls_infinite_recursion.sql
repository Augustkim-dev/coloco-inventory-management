-- =====================================================
-- Fix: users 테이블 RLS 무한 재귀 문제 해결
-- =====================================================
--
-- PROBLEM:
--   "HQ_Admin can view all users" 정책이 무한 재귀를 발생시킴
--   정책 내에서 users 테이블을 조회하면, 그 조회에서 또 정책이 실행됨
--
-- SOLUTION:
--   1. 현재 사용자의 role을 반환하는 함수 생성
--   2. 이 함수는 security definer로 RLS를 우회
--   3. 정책에서 이 함수를 사용
--
-- CREATED: 2025-10-31
-- =====================================================

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "HQ_Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "HQ_Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "HQ_Admin can update users" ON public.users;

-- Step 2: Create helper function to get current user's role
-- This function bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with the privileges of the function owner (bypasses RLS)
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role directly without triggering RLS
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  RETURN user_role;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS 'Returns the role of the currently authenticated user, bypassing RLS to avoid infinite recursion';

-- Step 3: Recreate policies using the helper function
-- HQ_Admin can view all users
CREATE POLICY "HQ_Admin can view all users"
  ON public.users
  FOR SELECT
  USING (
    public.get_current_user_role() = 'HQ_Admin'
  );

-- HQ_Admin can insert users
CREATE POLICY "HQ_Admin can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'HQ_Admin'
  );

-- HQ_Admin can update users
CREATE POLICY "HQ_Admin can update users"
  ON public.users
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'HQ_Admin'
  );

-- Step 4: Add policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Users can update own profile" ON public.users IS 'Allows users to update their own profile (e.g., preferred_language)';
