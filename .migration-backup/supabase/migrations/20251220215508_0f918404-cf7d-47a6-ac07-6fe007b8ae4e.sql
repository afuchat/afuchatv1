-- Add target_countries column to mini_programs table
-- NULL or empty array means available in all countries
-- Otherwise, only users from specified countries can access the app
ALTER TABLE public.mini_programs ADD COLUMN IF NOT EXISTS target_countries text[] DEFAULT NULL;