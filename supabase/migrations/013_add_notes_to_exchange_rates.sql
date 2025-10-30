-- Add notes column to exchange_rates table
-- This allows users to add optional notes about exchange rate changes

ALTER TABLE public.exchange_rates
ADD COLUMN notes TEXT;

-- Add updated_at column for tracking modifications
ALTER TABLE public.exchange_rates
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
