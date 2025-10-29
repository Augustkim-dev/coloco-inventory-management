-- ============================================================
-- Arno Cosmetics Inventory Management System
-- Seed Data for Testing Phase 03 (Purchase Orders Workflow)
-- ============================================================
--
-- 이 스크립트는 다음 테스트 시나리오를 지원합니다:
-- 1. PO 생성 (공급업체 선택, 제품 추가)
-- 2. PO 승인
-- 3. HQ 입고 처리
-- 4. 재고 확인
--
-- 실행 방법: Supabase SQL Editor에서 전체 복사 후 실행
-- ============================================================

-- ============================================================
-- 1. SUPPLIERS (공급업체) - 5개
-- ============================================================

INSERT INTO public.suppliers (id, name, contact_person, phone, email, address, notes)
VALUES
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Seoul Beauty Co., Ltd.',
    'Kim Min-ji',
    '+82-2-1234-5678',
    'sales@seoulbeauty.kr',
    '123 Gangnam-daero, Gangnam-gu, Seoul, South Korea',
    'Premium skincare manufacturer with 20+ years experience'
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'Jeju Natural Cosmetics',
    'Park Ji-hoon',
    '+82-64-987-6543',
    'info@jejunatural.com',
    '456 Hallasan-ro, Jeju-si, Jeju, South Korea',
    'Natural ingredients from Jeju Island. Certified organic.'
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003',
    'K-Beauty Labs Inc.',
    'Lee Soo-jin',
    '+82-31-555-8888',
    'contact@kbeautylabs.kr',
    '789 Innovation-ro, Bundang-gu, Seongnam, South Korea',
    'Innovative K-beauty formulations. Strong R&D team.'
  ),
  (
    'a1b2c3d4-0004-0004-0004-000000000004',
    'Busan Marine Skincare',
    'Choi Hyun-woo',
    '+82-51-222-3333',
    'export@busanmarine.co.kr',
    '321 Haeundae-ro, Haeundae-gu, Busan, South Korea',
    'Marine collagen and seaweed-based products'
  ),
  (
    'a1b2c3d4-0005-0005-0005-000000000005',
    'Hanbok Herbal Beauty',
    'Jung Yeon-hee',
    '+82-2-777-9999',
    'sales@hanbokherbal.com',
    '567 Insadong-gil, Jongno-gu, Seoul, South Korea',
    'Traditional Korean herbal cosmetics. Hanbang formulas.'
  );

-- ============================================================
-- 2. PRODUCTS (제품) - 15개
-- ============================================================

INSERT INTO public.products (id, sku, name, name_ko, name_vn, name_cn, category, unit, shelf_life_days, description)
VALUES
  -- Skincare (7 products)
  (
    'b1b2c3d4-1001-1001-1001-000000000001',
    'SKN-HYA-SRM-100',
    'Hyaluronic Acid Serum 100ml',
    '히알루론산 세럼 100ml',
    'Serum Axit Hyaluronic 100ml',
    '透明质酸精华液 100ml',
    'skincare',
    'EA',
    1095,  -- 3 years
    'Deep hydration serum with 3 types of hyaluronic acid'
  ),
  (
    'b1b2c3d4-1002-1002-1002-000000000002',
    'SKN-VTC-CRM-50',
    'Vitamin C Brightening Cream 50ml',
    '비타민 C 브라이트닝 크림 50ml',
    'Kem Dưỡng Trắng Vitamin C 50ml',
    '维生素C美白霜 50ml',
    'skincare',
    'EA',
    730,   -- 2 years
    'Brightening cream with 20% vitamin C derivative'
  ),
  (
    'b1b2c3d4-1003-1003-1003-000000000003',
    'SKN-SNL-MSK-10',
    'Snail Mucin Sheet Mask (10 pack)',
    '달팽이 점액 시트마스크 (10매입)',
    'Mặt Nạ Giấy Chất Nhầy Ốc Sên (10 miếng)',
    '蜗牛粘液面膜 (10片装)',
    'skincare',
    'PACK',
    730,
    'Regenerating sheet masks with 95% snail secretion filtrate'
  ),
  (
    'b1b2c3d4-1004-1004-1004-000000000004',
    'SKN-GRN-CLN-150',
    'Green Tea Foam Cleanser 150ml',
    '녹차 폼 클렌저 150ml',
    'Sữa Rửa Mặt Trà Xanh 150ml',
    '绿茶洁面泡沫 150ml',
    'skincare',
    'EA',
    1095,
    'Gentle foam cleanser with Jeju green tea extract'
  ),
  (
    'b1b2c3d4-1005-1005-1005-000000000005',
    'SKN-RET-SRM-30',
    'Retinol Night Serum 30ml',
    '레티놀 나이트 세럼 30ml',
    'Serum Đêm Retinol 30ml',
    '视黄醇晚霜精华 30ml',
    'skincare',
    'EA',
    545,   -- 1.5 years (retinol degrades faster)
    'Anti-aging serum with 0.5% pure retinol'
  ),
  (
    'b1b2c3d4-1006-1006-1006-000000000006',
    'SKN-AHA-TON-200',
    'AHA/BHA Toner 200ml',
    'AHA/BHA 토너 200ml',
    'Nước Hoa Hồng AHA/BHA 200ml',
    'AHA/BHA爽肤水 200ml',
    'skincare',
    'EA',
    730,
    'Exfoliating toner with 5% AHA and 2% BHA'
  ),
  (
    'b1b2c3d4-1007-1007-1007-000000000007',
    'SKN-CNT-EYE-20',
    'Centella Eye Cream 20ml',
    '센텔라 아이크림 20ml',
    'Kem Mắt Rau Má 20ml',
    '积雪草眼霜 20ml',
    'skincare',
    'EA',
    730,
    'Soothing eye cream with centella asiatica'
  ),

  -- Makeup (4 products)
  (
    'b1b2c3d4-2001-2001-2001-000000000008',
    'MKP-CSH-21',
    'Cushion Foundation #21 Natural Beige',
    '쿠션 파운데이션 #21 내추럴 베이지',
    'Phấn Nước Cushion #21 Be Tự Nhiên',
    '气垫粉底 #21 自然米色',
    'makeup',
    'EA',
    1095,
    'Long-lasting cushion with SPF50+ PA+++'
  ),
  (
    'b1b2c3d4-2002-2002-2002-000000000009',
    'MKP-LIP-RD01',
    'Matte Lipstick Red #01',
    '매트 립스틱 레드 #01',
    'Son Môi Matte Đỏ #01',
    '哑光口红 红色 #01',
    'makeup',
    'EA',
    1095,
    'Transfer-proof matte lipstick with vitamin E'
  ),
  (
    'b1b2c3d4-2003-2003-2003-000000000010',
    'MKP-MSC-BLK',
    'Volume Mascara Black',
    '볼륨 마스카라 블랙',
    'Mascara Dày Mi Đen',
    '浓密睫毛膏 黑色',
    'makeup',
    'EA',
    730,
    'Waterproof volume mascara'
  ),
  (
    'b1b2c3d4-2004-2004-2004-000000000011',
    'MKP-EYE-NUD',
    'Eyeshadow Palette Nude 12 Colors',
    '아이섀도우 팔레트 누드 12색',
    'Bảng Phấn Mắt Nude 12 Màu',
    '眼影盘 裸色 12色',
    'makeup',
    'EA',
    1095,
    '12-color nude eyeshadow palette with mirror'
  ),

  -- Haircare (2 products)
  (
    'b1b2c3d4-3001-3001-3001-000000000012',
    'HAR-RPR-SHP-500',
    'Repair Shampoo 500ml',
    '리페어 샴푸 500ml',
    'Dầu Gội Phục Hồi 500ml',
    '修复洗发水 500ml',
    'haircare',
    'EA',
    1095,
    'Damage repair shampoo with keratin and argan oil'
  ),
  (
    'b1b2c3d4-3002-3002-3002-000000000013',
    'HAR-TRT-MSK-200',
    'Hair Treatment Mask 200ml',
    '헤어 트리트먼트 마스크 200ml',
    'Ủ Tóc Phục Hồi 200ml',
    '护发发膜 200ml',
    'haircare',
    'EA',
    730,
    'Intensive treatment mask for damaged hair'
  ),

  -- Bodycare (2 products)
  (
    'b1b2c3d4-4001-4001-4001-000000000014',
    'BDY-LOT-CHR-300',
    'Cherry Blossom Body Lotion 300ml',
    '벚꽃 바디로션 300ml',
    'Sữa Dưỡng Thể Hoa Anh Đào 300ml',
    '樱花身体乳 300ml',
    'bodycare',
    'EA',
    1095,
    'Moisturizing body lotion with cherry blossom extract'
  ),
  (
    'b1b2c3d4-4002-4002-4002-000000000015',
    'BDY-SCR-GRN-250',
    'Green Tea Body Scrub 250ml',
    '녹차 바디 스크럽 250ml',
    'Tẩy Tế Bào Chết Trà Xanh 250ml',
    '绿茶身体磨砂膏 250ml',
    'bodycare',
    'EA',
    730,
    'Exfoliating body scrub with green tea and sugar'
  );

-- ============================================================
-- 3. EXCHANGE_RATES (환율) - 현재 기준
-- ============================================================

INSERT INTO public.exchange_rates (id, from_currency, to_currency, rate, effective_date)
VALUES
  -- KRW → VND
  (
    'c1b2c3d4-e001-e001-e001-000000000001',
    'KRW',
    'VND',
    18.50,
    '2025-10-01'
  ),
  -- KRW → CNY
  (
    'c1b2c3d4-e002-e002-e002-000000000002',
    'KRW',
    'CNY',
    0.0052,
    '2025-10-01'
  ),
  -- VND → KRW (역환율)
  (
    'c1b2c3d4-e003-e003-e003-000000000003',
    'VND',
    'KRW',
    0.054,
    '2025-10-01'
  ),
  -- CNY → KRW (역환율)
  (
    'c1b2c3d4-e004-e004-e004-000000000004',
    'CNY',
    'KRW',
    192.31,
    '2025-10-01'
  );

-- ============================================================
-- 4. PRICING_CONFIGS (가격 설정) - 주요 제품별
-- ============================================================

-- Vietnam Branch 가격 설정 (10개 제품)
INSERT INTO public.pricing_configs (id, product_id, from_location_id, to_location_id, purchase_price, transfer_cost, hq_margin_percent, branch_margin_percent, exchange_rate, final_price, currency)
SELECT
  gen_random_uuid(),
  p.id,
  (SELECT id FROM locations WHERE location_type = 'HQ' LIMIT 1),
  (SELECT id FROM locations WHERE location_type = 'Branch' AND country = 'Vietnam' LIMIT 1),
  CASE p.sku
    WHEN 'SKN-HYA-SRM-100' THEN 25000  -- KRW
    WHEN 'SKN-VTC-CRM-50' THEN 35000
    WHEN 'SKN-SNL-MSK-10' THEN 15000
    WHEN 'SKN-GRN-CLN-150' THEN 12000
    WHEN 'SKN-RET-SRM-30' THEN 45000
    WHEN 'MKP-CSH-21' THEN 28000
    WHEN 'MKP-LIP-RD01' THEN 18000
    WHEN 'MKP-MSC-BLK' THEN 15000
    WHEN 'HAR-RPR-SHP-500' THEN 20000
    WHEN 'BDY-LOT-CHR-300' THEN 16000
  END,
  2000,   -- transfer_cost (KRW)
  10.0,   -- hq_margin_percent
  30.0,   -- branch_margin_percent
  18.50,  -- exchange_rate (KRW to VND)
  CASE p.sku
    WHEN 'SKN-HYA-SRM-100' THEN 2400   -- Final price (rounded)
    WHEN 'SKN-VTC-CRM-50' THEN 3300
    WHEN 'SKN-SNL-MSK-10' THEN 1500
    WHEN 'SKN-GRN-CLN-150' THEN 1200
    WHEN 'SKN-RET-SRM-30' THEN 4200
    WHEN 'MKP-CSH-21' THEN 2700
    WHEN 'MKP-LIP-RD01' THEN 1800
    WHEN 'MKP-MSC-BLK' THEN 1500
    WHEN 'HAR-RPR-SHP-500' THEN 2000
    WHEN 'BDY-LOT-CHR-300' THEN 1600
  END,
  'VND'
FROM products p
WHERE p.sku IN (
  'SKN-HYA-SRM-100', 'SKN-VTC-CRM-50', 'SKN-SNL-MSK-10', 'SKN-GRN-CLN-150', 'SKN-RET-SRM-30',
  'MKP-CSH-21', 'MKP-LIP-RD01', 'MKP-MSC-BLK',
  'HAR-RPR-SHP-500', 'BDY-LOT-CHR-300'
);

-- China Branch 가격 설정 (5개 주요 제품)
INSERT INTO public.pricing_configs (id, product_id, from_location_id, to_location_id, purchase_price, transfer_cost, hq_margin_percent, branch_margin_percent, exchange_rate, final_price, currency)
SELECT
  gen_random_uuid(),
  p.id,
  (SELECT id FROM locations WHERE location_type = 'HQ' LIMIT 1),
  (SELECT id FROM locations WHERE location_type = 'Branch' AND country = 'China' LIMIT 1),
  CASE p.sku
    WHEN 'SKN-HYA-SRM-100' THEN 25000
    WHEN 'SKN-VTC-CRM-50' THEN 35000
    WHEN 'MKP-CSH-21' THEN 28000
    WHEN 'MKP-LIP-RD01' THEN 18000
    WHEN 'HAR-RPR-SHP-500' THEN 20000
  END,
  2000,
  10.0,
  35.0,   -- China has higher margin
  0.0052, -- exchange_rate (KRW to CNY)
  CASE p.sku
    WHEN 'SKN-HYA-SRM-100' THEN 250.00   -- Final price
    WHEN 'SKN-VTC-CRM-50' THEN 340.00
    WHEN 'MKP-CSH-21' THEN 280.00
    WHEN 'MKP-LIP-RD01' THEN 185.00
    WHEN 'HAR-RPR-SHP-500' THEN 205.00
  END,
  'CNY'
FROM products p
WHERE p.sku IN (
  'SKN-HYA-SRM-100', 'SKN-VTC-CRM-50',
  'MKP-CSH-21', 'MKP-LIP-RD01',
  'HAR-RPR-SHP-500'
);

-- ============================================================
-- 완료 메시지
-- ============================================================

-- 데이터 입력 확인
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed data insertion completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Suppliers inserted: %', (SELECT COUNT(*) FROM suppliers);
  RAISE NOTICE 'Products inserted: %', (SELECT COUNT(*) FROM products);
  RAISE NOTICE 'Exchange rates inserted: %', (SELECT COUNT(*) FROM exchange_rates);
  RAISE NOTICE 'Pricing configs inserted: %', (SELECT COUNT(*) FROM pricing_configs);
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now test Phase 03 workflow:';
  RAISE NOTICE '1. Login to http://localhost:3000';
  RAISE NOTICE '2. Navigate to Purchase Orders';
  RAISE NOTICE '3. Create PO → Select Supplier → Add Products';
  RAISE NOTICE '4. Approve PO';
  RAISE NOTICE '5. Receive at HQ → Enter batch info';
  RAISE NOTICE '6. Check stock_batches table for inventory';
  RAISE NOTICE '========================================';
END $$;
