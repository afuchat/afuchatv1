-- Create game_scores table for leaderboards
CREATE TABLE IF NOT EXISTS public.game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  score INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_challenges table for multiplayer
CREATE TABLE IF NOT EXISTS public.game_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  winner_id UUID REFERENCES profiles(id),
  challenger_score INTEGER,
  opponent_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create game_sessions table for real-time gameplay
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES game_challenges(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_scores
CREATE POLICY "Users can view all game scores"
ON public.game_scores FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own scores"
ON public.game_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for game_challenges
CREATE POLICY "Users can view challenges they're part of"
ON public.game_challenges FOR SELECT
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create challenges"
ON public.game_challenges FOR INSERT
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can update challenges they're part of"
ON public.game_challenges FOR UPDATE
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- RLS Policies for game_sessions
CREATE POLICY "Users can view sessions for their challenges"
ON public.game_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_challenges
    WHERE id = game_sessions.challenge_id
    AND (challenger_id = auth.uid() OR opponent_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own sessions"
ON public.game_sessions FOR INSERT
WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own sessions"
ON public.game_sessions FOR UPDATE
USING (auth.uid() = player_id);

-- Create indexes for better performance
CREATE INDEX idx_game_scores_user_game ON game_scores(user_id, game_type, difficulty);
CREATE INDEX idx_game_scores_leaderboard ON game_scores(game_type, difficulty, score DESC, created_at DESC);
CREATE INDEX idx_game_challenges_opponent ON game_challenges(opponent_id, status);
CREATE INDEX idx_game_challenges_challenger ON game_challenges(challenger_id, status);
CREATE INDEX idx_game_sessions_challenge ON game_sessions(challenge_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_game_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for game_sessions
CREATE TRIGGER update_game_sessions_updated_at
BEFORE UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_game_session_updated_at();

-- Enable realtime for game tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER TABLE game_challenges REPLICA IDENTITY FULL;
ALTER TABLE game_sessions REPLICA IDENTITY FULL;