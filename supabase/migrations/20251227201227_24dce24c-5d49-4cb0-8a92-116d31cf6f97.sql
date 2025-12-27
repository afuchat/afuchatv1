-- Add developer portfolio fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS portfolio_url text,
ADD COLUMN IF NOT EXISTS developer_tagline text,
ADD COLUMN IF NOT EXISTS available_for_hire boolean DEFAULT false;