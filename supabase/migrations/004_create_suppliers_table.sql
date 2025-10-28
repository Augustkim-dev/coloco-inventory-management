-- Create suppliers table
-- This table stores factory/supplier information

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only HQ Admin can modify suppliers
CREATE POLICY "HQ Admin can modify suppliers"
  ON public.suppliers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Create index for name lookups
CREATE INDEX idx_suppliers_name ON public.suppliers(name);

-- Create trigger for updated_at
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
