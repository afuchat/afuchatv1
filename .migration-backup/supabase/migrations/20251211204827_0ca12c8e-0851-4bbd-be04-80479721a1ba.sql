-- Add hide_on_leaderboard column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hide_on_leaderboard BOOLEAN DEFAULT false;