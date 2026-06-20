-- Add website_url field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN public.profiles.website_url IS 'User personal or business website URL';