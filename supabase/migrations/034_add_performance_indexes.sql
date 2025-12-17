-- =====================================================
-- Migration: Performance Optimization Indexes
-- Created: 2025-12-05
-- Purpose: RLS 정책 및 빈번한 쿼리 패턴 최적화
--
-- Note: Slow Query 분석 결과, 현재 애플리케이션 쿼리에서
-- 성능 문제는 발견되지 않았으나, 데이터 증가에 대비한
-- 예방적 최적화로 인덱스를 추가합니다.
-- =====================================================

-- =====================================================
-- HIGH PRIORITY INDEXES (4개)
-- =====================================================

-- 1. stock_batches: FIFO 재고 차감 최적화
-- 사용처: 판매 등록, 재고 이동
-- 쿼리 패턴: WHERE location_id = ? AND product_id = ?
--            AND quality_status = 'OK' AND qty_on_hand > 0
--            ORDER BY expiry_date ASC
CREATE INDEX IF NOT EXISTS idx_stock_active_inventory
ON public.stock_batches(location_id, product_id, expiry_date ASC)
WHERE quality_status = 'OK' AND qty_on_hand > 0;

-- 2. stock_batches: 유통기한 경고 조회 최적화
-- 사용처: 대시보드 유통기한 임박 경고
-- 쿼리 패턴: WHERE expiry_date <= ? AND quality_status = 'OK'
--            AND qty_on_hand > 0 ORDER BY expiry_date ASC
CREATE INDEX IF NOT EXISTS idx_stock_expiry_warning
ON public.stock_batches(expiry_date, location_id)
WHERE quality_status = 'OK' AND qty_on_hand > 0;

-- 3. sales: 제품별 매출 분석 최적화
-- 사용처: 대시보드 제품별 통계
-- 쿼리 패턴: WHERE product_id = ? ORDER BY sale_date DESC
CREATE INDEX IF NOT EXISTS idx_sales_product_date
ON public.sales(product_id, sale_date DESC);

-- 4. pricing_configs: 출발지 기준 가격 조회
-- 사용처: 가격 설정 페이지
-- 쿼리 패턴: WHERE from_location_id = ?
CREATE INDEX IF NOT EXISTS idx_pricing_from_location
ON public.pricing_configs(from_location_id);

-- =====================================================
-- MEDIUM PRIORITY INDEXES (2개)
-- =====================================================

-- 5. exchange_rates: 최신 환율 조회 최적화
-- 사용처: 가격 계산, 환율 표시
-- 쿼리 패턴: WHERE from_currency = ? AND to_currency = ?
--            ORDER BY effective_date DESC LIMIT 1
CREATE INDEX IF NOT EXISTS idx_exchange_rates_latest
ON public.exchange_rates(from_currency, to_currency, effective_date DESC);

-- 6. purchase_orders: 상태별 날짜순 조회
-- 사용처: 발주 관리 페이지
-- 쿼리 패턴: WHERE status = ? ORDER BY order_date DESC
CREATE INDEX IF NOT EXISTS idx_po_status_date
ON public.purchase_orders(status, order_date DESC);

-- =====================================================
-- COMMENT: Index purpose documentation
-- =====================================================
COMMENT ON INDEX public.idx_stock_active_inventory IS 'FIFO 재고 차감 성능 최적화 - 판매 및 재고 이동 시 사용';
COMMENT ON INDEX public.idx_stock_expiry_warning IS '유통기한 경고 조회 최적화 - 대시보드 알림용';
COMMENT ON INDEX public.idx_sales_product_date IS '제품별 매출 분석 최적화 - 대시보드 통계용';
COMMENT ON INDEX public.idx_pricing_from_location IS '출발지 기준 가격 조회 최적화 - 가격 설정 페이지용';
COMMENT ON INDEX public.idx_exchange_rates_latest IS '최신 환율 조회 최적화 - 가격 계산용';
COMMENT ON INDEX public.idx_po_status_date IS '발주 상태별 조회 최적화 - 발주 관리 페이지용';
