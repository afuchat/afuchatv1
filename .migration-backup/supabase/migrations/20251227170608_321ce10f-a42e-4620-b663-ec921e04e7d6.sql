-- Add github_url column for developers
ALTER TABLE public.profiles
ADD COLUMN github_url text;