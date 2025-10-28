-- Create locations table for HQ and branches
-- This table stores information about headquarters and branch locations

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('HQ', 'Branch')),
  country_code TEXT NOT NULL, -- 'KR', 'VN', 'CN'
  currency TEXT NOT NULL CHECK (currency IN ('KRW', 'VND', 'CNY')),
  address TEXT,
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view locations
CREATE POLICY "Authenticated users can view locations"
  ON public.locations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only HQ Admin can modify locations
CREATE POLICY "HQ Admin can modify locations"
  ON public.locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_locations_type ON public.locations(location_type);
CREATE INDEX idx_locations_country ON public.locations(country_code);

-- Create trigger for updated_at
CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data (3 locations)
INSERT INTO public.locations (name, location_type, country_code, currency, address) VALUES
('Korea HQ', 'HQ', 'KR', 'KRW', 'Seoul, South Korea'),
('Vietnam Branch', 'Branch', 'VN', 'VND', 'Ho Chi Minh City, Vietnam'),
('China Branch', 'Branch', 'CN', 'CNY', 'Shanghai, China');
