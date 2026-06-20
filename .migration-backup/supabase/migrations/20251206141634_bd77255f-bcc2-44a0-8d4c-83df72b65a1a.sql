-- Add more columns to game_rooms for battle royale
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS player_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS game_state jsonb DEFAULT '{}'::jsonb;