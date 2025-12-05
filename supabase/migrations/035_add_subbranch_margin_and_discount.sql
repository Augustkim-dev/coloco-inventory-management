-- =====================================================
-- Migration: Add Sub Branch Margin and Discount
-- Created: 2025-12-05
-- Purpose: pricing_configs와 pricing_templates에
--          sub_branch_margin_percent, discount_percent,
--          discounted_price 컬럼 추가
-- =====================================================

-- =====================================================
-- Step 1: pricing_configs 테이블에 컬럼 추가
-- =====================================================

-- Sub Branch 마진 컬럼 추가
ALTER TABLE public.pricing_configs
  ADD COLUMN IF NOT EXISTS sub_branch_margin_percent DECIMAL(5,2) DEFAULT 0;

-- Sub Branch 마진 제약 조건
ALTER TABLE public.pricing_configs
  ADD CONSTRAINT check_sub_branch_margin_range
  CHECK (sub_branch_margin_percent >= 0 AND sub_branch_margin_percent < 100);

-- 할인율 컬럼 추가
ALTER TABLE public.pricing_configs
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0;

-- 할인율 제약 조건
ALTER TABLE public.pricing_configs
  ADD CONSTRAINT check_discount_percent_range
  CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- 할인판매가격 컬럼 추가
ALTER TABLE public.pricing_configs
  ADD COLUMN IF NOT EXISTS discounted_price DECIMAL(12,2);

-- 총 마진 제약 조건 (HQ + Branch + SubBranch < 100)
ALTER TABLE public.pricing_configs
  ADD CONSTRAINT check_pricing_total_margin
  CHECK (hq_margin_percent + branch_margin_percent + sub_branch_margin_percent < 100);

-- 기존 데이터의 discounted_price를 final_price와 동일하게 설정
UPDATE public.pricing_configs
SET discounted_price = final_price
WHERE discounted_price IS NULL;

-- =====================================================
-- Step 2: pricing_templates 테이블에 컬럼 추가
-- =====================================================

-- Sub Branch 마진 컬럼 추가
ALTER TABLE public.pricing_templates
  ADD COLUMN IF NOT EXISTS sub_branch_margin_percent DECIMAL(5,2) DEFAULT 0;

-- Sub Branch 마진 제약 조건
ALTER TABLE public.pricing_templates
  ADD CONSTRAINT check_template_sub_branch_margin_range
  CHECK (sub_branch_margin_percent >= 0 AND sub_branch_margin_percent < 100);

-- 할인율 컬럼 추가
ALTER TABLE public.pricing_templates
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0;

-- 할인율 제약 조건
ALTER TABLE public.pricing_templates
  ADD CONSTRAINT check_template_discount_percent_range
  CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- 기존 총 마진 제약 조건 삭제 (있다면)
ALTER TABLE public.pricing_templates
  DROP CONSTRAINT IF EXISTS valid_total_margin;

-- 새로운 총 마진 제약 조건 추가 (HQ + Branch + SubBranch < 100)
ALTER TABLE public.pricing_templates
  ADD CONSTRAINT check_template_total_margin
  CHECK (hq_margin_percent + branch_margin_percent + sub_branch_margin_percent < 100);

-- =====================================================
-- Step 3: 컬럼 코멘트 추가
-- =====================================================

COMMENT ON COLUMN public.pricing_configs.sub_branch_margin_percent IS 'Sub Branch 마진 퍼센트 (0-99). Main Branch에 적용 시 0';
COMMENT ON COLUMN public.pricing_configs.discount_percent IS '할인율 퍼센트 (0-100). 최종가격에서 할인 적용';
COMMENT ON COLUMN public.pricing_configs.discounted_price IS '할인 적용 후 판매가격. final_price × (1 - discount_percent/100)';

COMMENT ON COLUMN public.pricing_templates.sub_branch_margin_percent IS 'Sub Branch 마진 템플릿 값 (0-99)';
COMMENT ON COLUMN public.pricing_templates.discount_percent IS '할인율 템플릿 값 (0-100)';

-- =====================================================
-- Step 4: calculate_template_price 함수 수정
-- 새로운 파라미터 추가: sub_branch_margin, discount_percent
-- 반환: calculated_price, discounted_price
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_template_price_v2(
  p_purchase_price DECIMAL(12, 2),
  p_transfer_cost DECIMAL(12, 2),
  p_exchange_rate DECIMAL(10, 4),
  p_hq_margin DECIMAL(5, 2),
  p_branch_margin DECIMAL(5, 2),
  p_sub_branch_margin DECIMAL(5, 2),
  p_discount_percent DECIMAL(5, 2),
  p_target_currency TEXT
)
RETURNS TABLE (
  calculated_price DECIMAL(12, 2),
  discounted_price DECIMAL(12, 2)
) AS $$
DECLARE
  local_cost DECIMAL(12, 2);
  total_margin DECIMAL(5, 2);
  margin_factor DECIMAL(5, 4);
  calc_price DECIMAL(12, 2);
  rounded_price DECIMAL(12, 2);
  disc_price DECIMAL(12, 2);
BEGIN
  -- 총 마진 계산
  total_margin := COALESCE(p_hq_margin, 0) + COALESCE(p_branch_margin, 0) + COALESCE(p_sub_branch_margin, 0);

  -- 마진 검증
  IF total_margin >= 100 THEN
    RAISE EXCEPTION 'Invalid margin configuration: total margin cannot be >= 100%% (current: %%)', total_margin;
  END IF;

  -- 로컬 비용 계산 (환율 적용)
  local_cost := (COALESCE(p_purchase_price, 0) + COALESCE(p_transfer_cost, 0)) * COALESCE(p_exchange_rate, 1);

  -- 마진 팩터 계산
  margin_factor := 1 - (total_margin / 100.0);

  -- 판매가격 계산
  calc_price := local_cost / margin_factor;

  -- 통화별 반올림
  CASE p_target_currency
    WHEN 'VND' THEN
      rounded_price := ROUND(calc_price / 1000) * 1000;
    WHEN 'CNY' THEN
      rounded_price := ROUND(calc_price, 2);
    WHEN 'KRW' THEN
      rounded_price := ROUND(calc_price / 100) * 100;
    ELSE
      rounded_price := ROUND(calc_price, 2);
  END CASE;

  -- 할인가격 계산
  disc_price := rounded_price * (1 - COALESCE(p_discount_percent, 0) / 100.0);

  -- 통화별 반올림 (할인가격)
  CASE p_target_currency
    WHEN 'VND' THEN
      disc_price := ROUND(disc_price / 1000) * 1000;
    WHEN 'CNY' THEN
      disc_price := ROUND(disc_price, 2);
    WHEN 'KRW' THEN
      disc_price := ROUND(disc_price / 100) * 100;
    ELSE
      disc_price := ROUND(disc_price, 2);
  END CASE;

  RETURN QUERY SELECT rounded_price, disc_price;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_template_price_v2 IS 'Sub Branch 마진과 할인율을 포함한 가격 계산 함수 (v2)';

-- =====================================================
-- Step 5: 인덱스 추가 (할인 가격 조회 최적화)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pricing_discount_percent
ON public.pricing_configs(discount_percent)
WHERE discount_percent > 0;

COMMENT ON INDEX public.idx_pricing_discount_percent IS '할인이 적용된 가격 설정 조회 최적화';
