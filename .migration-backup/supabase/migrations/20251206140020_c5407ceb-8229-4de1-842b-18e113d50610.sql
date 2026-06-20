-- Create table for multiplayer game rooms
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL UNIQUE,
  game_type VARCHAR(50) NOT NULL DEFAULT 'afu_arena',
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  host_score INTEGER NOT NULL DEFAULT 0,
  guest_score INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  round INTEGER NOT NULL DEFAULT 1,
  max_rounds INTEGER NOT NULL DEFAULT 5,
  current_target_x FLOAT,
  current_target_y FLOAT,
  target_spawned_at TIMESTAMPTZ,
  winner_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Policies for game rooms
CREATE POLICY "Anyone can view game rooms" 
ON public.game_rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create game rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Players can update their game rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Hosts can delete their game rooms" 
ON public.game_rooms 
FOR DELETE 
USING (auth.uid() = host_id);

-- Enable realtime for game_rooms
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;

-- Index for quick room code lookups
CREATE INDEX idx_game_rooms_room_code ON public.game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON public.game_rooms(status);