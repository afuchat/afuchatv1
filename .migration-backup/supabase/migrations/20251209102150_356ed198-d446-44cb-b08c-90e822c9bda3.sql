-- Add column to hide following list from other users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_following_list boolean DEFAULT false;