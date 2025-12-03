-- Migration: Add default_purchase_price to products table
-- Description: Allows setting default purchase price on products for pricing template application
-- Date: 2024-12-04

-- Step 1: Add default_purchase_price column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS default_purchase_price DECIMAL(12, 2) DEFAULT NULL;

-- Step 2: Add comment
COMMENT ON COLUMN public.products.default_purchase_price IS
  'Default purchase price in KRW. Used when no PO price is available for pricing template application.';

-- Step 3: Create index for potential filtering/sorting
CREATE INDEX IF NOT EXISTS idx_products_default_purchase_price
  ON public.products(default_purchase_price)
  WHERE default_purchase_price IS NOT NULL;
