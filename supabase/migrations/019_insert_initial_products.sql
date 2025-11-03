-- Insert initial product data
-- Products from the provided list

INSERT INTO public.products (
  sku,
  name,
  name_ko,
  category,
  unit,
  shelf_life_days,
  description
) VALUES
  (
    'JUNESS-SET-3',
    'JUNESS 3 SET',
    '주네스 3종 SET',
    'Cosmetics Set',
    'SET',
    1095, -- 3 years for cosmetics
    'Hyaluronic Acid Cream 50g, Cell Repair Essence 50g, Cell Repair Cream 50g'
  ),
  (
    'JUNESS-MASK-PACK',
    'JUNESS MASK PACK',
    '주네스 마스크팩에센스',
    'Mask Pack',
    'BOX',
    730, -- 2 years
    'Cell Repair Essence Mask Pack 30g, Cell Repair Cream Mask Pack 30g (5 sheets per box)'
  ),
  (
    'JUNESS-MASK-CREAM',
    'JUNESS MASK PACK CREAM',
    '주네스 마스크팩 크림',
    'Mask Pack',
    'BOX',
    730, -- 2 years
    'Cell Repair Essence Mask Pack 30g, Cell Repair Cream Mask Pack 30g (5 sheets per box)'
  ),
  (
    'ZENSIA',
    'ZENSIA',
    '제시아',
    'Health Supplement',
    'BOX',
    730, -- 2 years
    'Pomegranate Collagen 1.6g (10 sachets per box)'
  ),
  (
    'DRS-WELLY',
    'DR''S WELLY',
    '닥터스웰리',
    'Health Supplement',
    'BOX',
    730, -- 2 years
    'V-Slim Collagen 150mg (10 sachets)'
  ),
  (
    'BOWDON-EXOSHINE',
    'BOWDON EXOSHINE',
    '보던 엑소샤인',
    'Ampoule',
    'BOX',
    1095, -- 3 years
    'Ampoule (Vitamin) 5ml (8 pieces per box)'
  ),
  (
    'LDM905',
    'LDM905',
    'LDM905',
    'Ampoule',
    'BOX',
    1095, -- 3 years
    'Ampoule (Vitamin) 5ml (8 pieces per box)'
  ),
  (
    'WINKLE-SKIN-BOOSTER',
    'WINKLE SKIN BOOSTER',
    '링클 스킨 부스터',
    'Skin Booster',
    'BOX',
    1095, -- 3 years
    'Ampoule (Vitamin) 4ml (5 pieces per box)'
  ),
  (
    'MOISTURIZING-SKIN-BOOSTER',
    'MOISTURIZING SKIN BOOSTER',
    '모이스춰라이징 스킨 부스터',
    'Skin Booster',
    'BOX',
    1095, -- 3 years
    'Ampoule (Vitamin) 4ml (5 pieces per box)'
  ),
  (
    'FRECKLE-SKIN-BOOSTER',
    'FRECKLE SKIN BOOSTER',
    '프레클 스킨 부스터',
    'Skin Booster',
    'BOX',
    1095, -- 3 years
    'Ampoule (Vitamin) 4ml (5 pieces per box)'
  ),
  (
    'ACNE-SKIN-BOOSTER',
    'ACNE SKIN BOOSTER',
    '아크네 스킨 부스터',
    'Skin Booster',
    'BOX',
    1095, -- 3 years
    'Ampoule (Vitamin) 4ml (5 pieces per box)'
  ),
  (
    'WHITENING-SKIN-BOOSTER',
    'WHITENING SKIN BOOSTER',
    '화이트닝 스킨 부스터',
    'Skin Booster',
    'BOX',
    1095, -- 3 years
    'Ampoule (Vitamin) 4ml (5 pieces per box)'
  );

-- Link all products to DK company supplier
-- This creates the many-to-many relationship between supplier and products
INSERT INTO public.supplier_products (
  supplier_id,
  product_id,
  unit_price,
  lead_time_days,
  minimum_order_qty,
  is_primary_supplier,
  is_active
)
SELECT
  '3ad6c3de-bb99-4bdd-9f20-e4bb04cfee87'::uuid, -- DK company co.Ltd ID
  p.id,
  NULL, -- Unit price to be set later
  7, -- Default 7 days lead time
  1, -- Default MOQ of 1
  true, -- Set as primary supplier
  true -- Active status
FROM public.products p
WHERE p.sku IN (
  'JUNESS-SET-3',
  'JUNESS-MASK-PACK',
  'JUNESS-MASK-CREAM',
  'ZENSIA',
  'DRS-WELLY',
  'BOWDON-EXOSHINE',
  'LDM905',
  'WINKLE-SKIN-BOOSTER',
  'MOISTURIZING-SKIN-BOOSTER',
  'FRECKLE-SKIN-BOOSTER',
  'ACNE-SKIN-BOOSTER',
  'WHITENING-SKIN-BOOSTER'
);

-- Verify the inserted products and supplier relationships
SELECT
  p.sku,
  p.name,
  p.name_ko,
  p.category,
  s.name as supplier_name,
  sp.is_primary_supplier,
  sp.is_active
FROM public.products p
LEFT JOIN public.supplier_products sp ON p.id = sp.product_id
LEFT JOIN public.suppliers s ON sp.supplier_id = s.id
WHERE p.sku IN (
  'JUNESS-SET-3',
  'JUNESS-MASK-PACK',
  'JUNESS-MASK-CREAM',
  'ZENSIA',
  'DRS-WELLY',
  'BOWDON-EXOSHINE',
  'LDM905',
  'WINKLE-SKIN-BOOSTER',
  'MOISTURIZING-SKIN-BOOSTER',
  'FRECKLE-SKIN-BOOSTER',
  'ACNE-SKIN-BOOSTER',
  'WHITENING-SKIN-BOOSTER'
)
ORDER BY p.created_at DESC;
