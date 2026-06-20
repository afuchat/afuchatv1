-- Add hide_followers_list column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_followers_list boolean DEFAULT false;