-- Add interests column to profiles table for onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[];