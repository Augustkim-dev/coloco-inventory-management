-- =====================================================
-- Migration: Fix pricing_configs SELECT RLS for SubBranch
-- Created: 2025-12-08
-- Purpose: Branch Manager가 하위 지점(SubBranch)의
--          pricing_configs도 조회할 수 있도록 RLS 정책 수정
--
-- 문제: 기존 RLS 정책은 location_id = to_location_id 정확히 일치만 허용
--      → SubBranch 가격 설정이 있어도 조회 불가
--      → 항상 부모 가격으로 fallback → "(상속)" 표시
--
-- 해결: get_child_locations() 함수를 사용하여 하위 위치도 조회 허용
-- =====================================================

-- 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "Users can view pricing configs for their location"
  ON public.pricing_configs;

-- 새로운 SELECT 정책: 계층 구조 지원
CREATE POLICY "Users can view pricing configs for their location hierarchy"
  ON public.pricing_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND (
        -- HQ Admin: 모든 가격 설정 조회 가능
        u.role = 'HQ_Admin'
        OR
        -- Branch Manager: 본인 위치 + 하위 위치의 가격 설정 조회 가능
        (
          u.role = 'Branch_Manager'
          AND (
            -- 본인 위치의 가격 설정
            u.location_id = pricing_configs.to_location_id
            OR
            -- 하위 위치(SubBranch)의 가격 설정
            pricing_configs.to_location_id IN (
              SELECT location_id FROM get_child_locations(u.location_id)
            )
          )
        )
      )
    )
  );

-- 코멘트 추가
COMMENT ON POLICY "Users can view pricing configs for their location hierarchy"
  ON public.pricing_configs
  IS 'Branch Manager가 본인 위치 및 하위 SubBranch의 가격 설정을 조회할 수 있도록 허용';
