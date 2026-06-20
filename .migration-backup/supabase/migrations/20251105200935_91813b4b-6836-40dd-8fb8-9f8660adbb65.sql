-- Add XP and streak tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS current_grade TEXT DEFAULT 'Newcomer',
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date DATE;

-- Create activity log table to track XP-earning actions
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity log
CREATE POLICY "Users can view their own activity"
ON public.user_activity_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity"
ON public.user_activity_log FOR INSERT
WITH CHECK (true);

-- RLS policies for achievements
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view achievements"
ON public.user_achievements FOR SELECT
USING (true);

CREATE POLICY "System can insert achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (true);

-- Function to award XP
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_action_type TEXT,
  p_xp_amount INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_xp INTEGER;
  v_new_grade TEXT;
BEGIN
  -- Log the activity
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (p_user_id, p_action_type, p_xp_amount, p_metadata);
  
  -- Update user XP
  UPDATE public.profiles
  SET xp = xp + p_xp_amount
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;
  
  -- Calculate and update grade
  v_new_grade := CASE
    WHEN v_new_xp >= 5000 THEN 'Legend'
    WHEN v_new_xp >= 1500 THEN 'Elite Creator'
    WHEN v_new_xp >= 500 THEN 'Community Builder'
    WHEN v_new_xp >= 100 THEN 'Active Chatter'
    ELSE 'Newcomer'
  END;
  
  UPDATE public.profiles
  SET current_grade = v_new_grade
  WHERE id = p_user_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON public.profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);