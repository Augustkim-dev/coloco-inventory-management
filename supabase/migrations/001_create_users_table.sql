-- Create custom users table that extends auth.users
-- This table stores additional user information for role-based access control

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('HQ_Admin', 'Branch_Manager')),
  location_id UUID,  -- Foreign key will be added in Phase 02 after locations table is created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON public.users(email);

-- Create index on role for filtering
CREATE INDEX idx_users_role ON public.users(role);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: HQ_Admin can view all users
CREATE POLICY "HQ_Admin can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- RLS Policy: HQ_Admin can insert users
CREATE POLICY "HQ_Admin can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- RLS Policy: HQ_Admin can update users
CREATE POLICY "HQ_Admin can update users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HQ_Admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Note: locations table will be created in Phase 02
-- For Phase 01, location_id can be NULL
-- Once locations table is created, we can add the foreign key constraint
