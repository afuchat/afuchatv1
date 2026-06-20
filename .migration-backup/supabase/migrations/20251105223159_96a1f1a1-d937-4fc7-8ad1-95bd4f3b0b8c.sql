-- Phase 2: Gamification enhancements

-- Add profile completion tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completion_rewarded BOOLEAN DEFAULT false;

-- Add achievement tracking improvements
ALTER TABLE public.user_achievements
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create referral tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  rewarded BOOLEAN DEFAULT false,
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referral policies
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referrer_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);

-- Function to check and award daily login streak
CREATE OR REPLACE FUNCTION public.check_daily_login_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_login DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_xp_awarded INTEGER := 0;
BEGIN
  -- Get current login data
  SELECT last_login_date, login_streak
  INTO v_last_login, v_current_streak
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If no last login or it's today, don't award
  IF v_last_login = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'streak', v_current_streak,
      'xp_awarded', 0,
      'message', 'Already logged in today'
    );
  END IF;
  
  -- Calculate new streak
  IF v_last_login = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Streak broken, start over
    v_new_streak := 1;
  END IF;
  
  -- Award XP for daily login
  v_xp_awarded := 10;
  
  -- Bonus XP for streaks
  IF v_new_streak >= 7 THEN
    v_xp_awarded := v_xp_awarded + 5; -- 7-day streak bonus
  END IF;
  
  IF v_new_streak >= 30 THEN
    v_xp_awarded := v_xp_awarded + 10; -- 30-day streak bonus
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    login_streak = v_new_streak,
    last_login_date = CURRENT_DATE,
    xp = xp + v_xp_awarded
  WHERE id = p_user_id;
  
  -- Log activity
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (
    p_user_id,
    'daily_login',
    v_xp_awarded,
    jsonb_build_object('streak', v_new_streak)
  );
  
  -- Check for streak achievements
  IF v_new_streak = 7 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_type = '7_day_streak'
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, '7_day_streak', jsonb_build_object('streak', v_new_streak));
  END IF;
  
  IF v_new_streak = 30 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_type = '30_day_streak'
  ) THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, '30_day_streak', jsonb_build_object('streak', v_new_streak));
  END IF;
  
  RETURN jsonb_build_object(
    'streak', v_new_streak,
    'xp_awarded', v_xp_awarded,
    'message', 'Daily login reward claimed!'
  );
END;
$$;

-- Function to check and award profile completion
CREATE OR REPLACE FUNCTION public.check_profile_completion(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_is_complete BOOLEAN;
  v_xp_awarded INTEGER := 0;
BEGIN
  -- Get profile data
  SELECT 
    display_name,
    handle,
    bio,
    profile_completion_rewarded
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check if already rewarded
  IF v_profile.profile_completion_rewarded THEN
    RETURN jsonb_build_object(
      'completed', true,
      'xp_awarded', 0,
      'message', 'Profile completion already rewarded'
    );
  END IF;
  
  -- Check if profile is complete
  v_is_complete := (
    v_profile.display_name IS NOT NULL AND LENGTH(TRIM(v_profile.display_name)) > 0 AND
    v_profile.handle IS NOT NULL AND LENGTH(TRIM(v_profile.handle)) > 0 AND
    v_profile.bio IS NOT NULL AND LENGTH(TRIM(v_profile.bio)) > 0
  );
  
  IF v_is_complete THEN
    v_xp_awarded := 15;
    
    -- Update profile
    UPDATE public.profiles
    SET 
      profile_completion_rewarded = true,
      xp = xp + v_xp_awarded
    WHERE id = p_user_id;
    
    -- Log activity
    INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
    VALUES (p_user_id, 'complete_profile', v_xp_awarded, '{}'::jsonb);
    
    -- Award achievement
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, 'profile_completed', '{}'::jsonb);
    
    RETURN jsonb_build_object(
      'completed', true,
      'xp_awarded', v_xp_awarded,
      'message', 'Profile completion reward claimed!'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'completed', false,
    'xp_awarded', 0,
    'message', 'Profile not yet complete'
  );
END;
$$;

-- Function to process referral rewards
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referral_code TEXT, p_referred_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_xp_awarded INTEGER := 20;
BEGIN
  -- Find the referral
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referral_code = p_referral_code
    AND referred_id = p_referred_id
    AND rewarded = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referral not found or already rewarded'
    );
  END IF;
  
  -- Award XP to referrer
  UPDATE public.profiles
  SET xp = xp + v_xp_awarded
  WHERE id = v_referral.referrer_id;
  
  -- Mark referral as rewarded
  UPDATE public.referrals
  SET rewarded = true
  WHERE id = v_referral.id;
  
  -- Log activity
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (
    v_referral.referrer_id,
    'referral_reward',
    v_xp_awarded,
    jsonb_build_object('referred_user_id', p_referred_id)
  );
  
  -- Check for referral achievements
  DECLARE
    v_referral_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_referral_count
    FROM public.referrals
    WHERE referrer_id = v_referral.referrer_id AND rewarded = true;
    
    IF v_referral_count = 5 AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements 
      WHERE user_id = v_referral.referrer_id AND achievement_type = '5_referrals'
    ) THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
      VALUES (v_referral.referrer_id, '5_referrals', jsonb_build_object('count', v_referral_count));
    END IF;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', v_xp_awarded,
    'message', 'Referral reward processed!'
  );
END;
$$;