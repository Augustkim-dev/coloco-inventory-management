-- Migration: Create get_available_stock() function
-- Description: Function to get total available stock for a product at a specific location
-- Date: 2025-10-30

-- Function to calculate available stock for a specific product at a location
CREATE OR REPLACE FUNCTION get_available_stock(
  p_location_id UUID,
  p_product_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(qty_available), 0)::INTEGER
    FROM stock_batches
    WHERE location_id = p_location_id
      AND product_id = p_product_id
      AND quality_status = 'OK'
  );
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_available_stock(UUID, UUID) IS 'Returns total available stock (qty_available) for a product at a specific location, excluding damaged or quarantined items';
