-- Add privacy_url and terms_url columns to mini_programs table
ALTER TABLE public.mini_programs 
ADD COLUMN IF NOT EXISTS privacy_url text,
ADD COLUMN IF NOT EXISTS terms_url text;