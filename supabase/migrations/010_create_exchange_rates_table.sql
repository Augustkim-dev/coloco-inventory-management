-- Create exchange_rates table
-- This table stores currency exchange rates (manual entry in MVP)

CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL CHECK (from_currency IN ('KRW', 'VND', 'CNY')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('KRW', 'VND', 'CNY')),
  rate DECIMAL(10, 4) NOT NULL CHECK (rate > 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, effective_date)
);

-- Enable Row Level Security
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view exchange rates
CREATE POLICY "Authenticated users can view exchange rates"
  ON public.exchange_rates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only HQ Admin can modify exchange rates
CREATE POLICY "HQ Admin can modify exchange rates"
  ON public.exchange_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(effective_date DESC);

-- Insert initial exchange rate data (example rates)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date) VALUES
('KRW', 'VND', 18.0, CURRENT_DATE),
('KRW', 'CNY', 0.0053, CURRENT_DATE);
