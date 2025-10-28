-- Add foreign key constraint to users.location_id
-- This must be executed AFTER creating the locations table

-- Add foreign key constraint
ALTER TABLE public.users
  ADD CONSTRAINT fk_users_location
  FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- Create index for join performance
CREATE INDEX idx_users_location ON public.users(location_id);
