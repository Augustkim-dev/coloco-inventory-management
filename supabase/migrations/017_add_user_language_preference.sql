-- Migration: Add language preference to users table
-- Purpose: Store user's preferred UI language for i18n support
-- Date: 2025-10-31

-- Add preferred_language column to users table
ALTER TABLE public.users
ADD COLUMN preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'ko', 'vi', 'zh'));

-- Add comment to document the column
COMMENT ON COLUMN public.users.preferred_language IS 'User preferred UI language: en (English), ko (Korean), vi (Vietnamese), zh (Chinese)';

-- Create index for faster queries (optional, but helpful for larger datasets)
CREATE INDEX idx_users_preferred_language ON public.users(preferred_language);
