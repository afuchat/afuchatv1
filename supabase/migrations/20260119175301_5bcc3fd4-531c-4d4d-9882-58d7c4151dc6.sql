-- Add tipping_enabled column to profiles table (default false - not visible by default)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tipping_enabled BOOLEAN DEFAULT false;