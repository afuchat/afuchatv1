-- Create creator earnings table
CREATE TABLE public.creator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ugx INTEGER NOT NULL DEFAULT 0,
  earned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator withdrawals table
CREATE TABLE public.creator_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ugx INTEGER NOT NULL,
  phone_number TEXT NOT NULL,
  mobile_network TEXT NOT NULL CHECK (mobile_network IN ('MTN', 'Airtel')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Add available_balance_ugx to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_balance_ugx INTEGER NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS policies for creator_earnings
CREATE POLICY "Users can view their own earnings" ON public.creator_earnings
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for creator_withdrawals
CREATE POLICY "Users can view their own withdrawals" ON public.creator_withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can request withdrawals" ON public.creator_withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check creator eligibility
CREATE OR REPLACE FUNCTION public.check_creator_eligibility(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country TEXT;
  v_follower_count INTEGER;
  v_weekly_views INTEGER;
  v_is_eligible BOOLEAN := false;
BEGIN
  -- Get user country
  SELECT country INTO v_country
  FROM profiles WHERE id = p_user_id;
  
  -- Check if from Uganda
  IF LOWER(v_country) != 'uganda' AND LOWER(v_country) != 'ug' THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'This program is only available for creators in Uganda'
    );
  END IF;
  
  -- Count followers
  SELECT COUNT(*) INTO v_follower_count
  FROM follows WHERE following_id = p_user_id;
  
  IF v_follower_count < 10 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'You need at least 10 followers to participate',
      'current_followers', v_follower_count
    );
  END IF;
  
  -- Calculate views in past week
  SELECT COALESCE(SUM(p.view_count), 0) INTO v_weekly_views
  FROM posts p
  WHERE p.author_id = p_user_id
    AND p.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  IF v_weekly_views < 500 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'You need at least 500 views on your posts in the past week',
      'current_views', v_weekly_views
    );
  END IF;
  
  RETURN jsonb_build_object(
    'eligible', true,
    'follower_count', v_follower_count,
    'weekly_views', v_weekly_views
  );
END;
$$;

-- Function to get user's daily engagement score
CREATE OR REPLACE FUNCTION public.get_daily_engagement(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_views INTEGER;
  v_likes INTEGER;
  v_score INTEGER;
BEGIN
  -- Get views on user's posts for the day
  SELECT COALESCE(SUM(p.view_count), 0) INTO v_views
  FROM posts p
  WHERE p.author_id = p_user_id
    AND DATE(p.created_at) = p_date;
  
  -- Get likes on user's posts for the day
  SELECT COUNT(*) INTO v_likes
  FROM post_acknowledgments pa
  JOIN posts p ON pa.post_id = p.id
  WHERE p.author_id = p_user_id
    AND DATE(pa.created_at) = p_date;
  
  -- Calculate score (views + likes*2 for weighting)
  v_score := v_views + (v_likes * 2);
  
  RETURN jsonb_build_object(
    'views', v_views,
    'likes', v_likes,
    'score', v_score
  );
END;
$$;

-- Function to distribute daily rewards
CREATE OR REPLACE FUNCTION public.distribute_daily_creator_rewards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_pool INTEGER := 5000; -- 5000 UGX daily
  v_total_score INTEGER := 0;
  v_eligible_creator RECORD;
  v_creator_share INTEGER;
  v_distributed INTEGER := 0;
  v_recipients INTEGER := 0;
BEGIN
  -- Check if already distributed today
  IF EXISTS (SELECT 1 FROM creator_earnings WHERE earned_date = CURRENT_DATE LIMIT 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Rewards already distributed for today'
    );
  END IF;
  
  -- Create temp table for eligible creators with scores
  CREATE TEMP TABLE temp_eligible_creators AS
  SELECT 
    p.id as user_id,
    (get_daily_engagement(p.id, CURRENT_DATE - INTERVAL '1 day')::jsonb->>'score')::INTEGER as score,
    (get_daily_engagement(p.id, CURRENT_DATE - INTERVAL '1 day')::jsonb->>'views')::INTEGER as views,
    (get_daily_engagement(p.id, CURRENT_DATE - INTERVAL '1 day')::jsonb->>'likes')::INTEGER as likes
  FROM profiles p
  WHERE LOWER(p.country) IN ('uganda', 'ug')
    AND (SELECT COUNT(*) FROM follows WHERE following_id = p.id) >= 10
    AND (SELECT COALESCE(SUM(view_count), 0) FROM posts WHERE author_id = p.id AND created_at >= CURRENT_DATE - INTERVAL '7 days') >= 500;
  
  -- Filter to only those with engagement yesterday
  DELETE FROM temp_eligible_creators WHERE score <= 0;
  
  -- Calculate total score
  SELECT COALESCE(SUM(score), 0) INTO v_total_score FROM temp_eligible_creators;
  
  IF v_total_score = 0 THEN
    DROP TABLE temp_eligible_creators;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No eligible creators with engagement found'
    );
  END IF;
  
  -- Distribute rewards weighted by score
  FOR v_eligible_creator IN SELECT * FROM temp_eligible_creators LOOP
    v_creator_share := FLOOR((v_eligible_creator.score::DECIMAL / v_total_score) * v_daily_pool);
    
    IF v_creator_share > 0 THEN
      -- Record earning
      INSERT INTO creator_earnings (user_id, amount_ugx, engagement_score, views_count, likes_count)
      VALUES (v_eligible_creator.user_id, v_creator_share, v_eligible_creator.score, v_eligible_creator.views, v_eligible_creator.likes);
      
      -- Update user balance
      UPDATE profiles
      SET available_balance_ugx = available_balance_ugx + v_creator_share
      WHERE id = v_eligible_creator.user_id;
      
      v_distributed := v_distributed + v_creator_share;
      v_recipients := v_recipients + 1;
    END IF;
  END LOOP;
  
  DROP TABLE temp_eligible_creators;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_distributed', v_distributed,
    'recipients', v_recipients
  );
END;
$$;

-- Function to request withdrawal (weekends only)
CREATE OR REPLACE FUNCTION public.request_creator_withdrawal(p_phone_number TEXT, p_network TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_day_of_week INTEGER;
BEGIN
  -- Check if weekend (Saturday=6, Sunday=0)
  v_day_of_week := EXTRACT(DOW FROM CURRENT_DATE);
  IF v_day_of_week NOT IN (0, 6) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Withdrawals are only available on weekends (Saturday and Sunday)'
    );
  END IF;
  
  -- Get user balance
  SELECT available_balance_ugx INTO v_balance
  FROM profiles WHERE id = v_user_id;
  
  -- Check minimum
  IF v_balance < 5000 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Minimum withdrawal is 5000 UGX. Your balance: ' || v_balance || ' UGX'
    );
  END IF;
  
  -- Check pending withdrawal
  IF EXISTS (SELECT 1 FROM creator_withdrawals WHERE user_id = v_user_id AND status IN ('pending', 'processing')) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already have a pending withdrawal request'
    );
  END IF;
  
  -- Create withdrawal request
  INSERT INTO creator_withdrawals (user_id, amount_ugx, phone_number, mobile_network)
  VALUES (v_user_id, v_balance, p_phone_number, p_network);
  
  -- Deduct from balance
  UPDATE profiles
  SET available_balance_ugx = 0
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request submitted! You will receive ' || v_balance || ' UGX via ' || p_network || ' Mobile Money',
    'amount', v_balance
  );
END;
$$;

-- Create indexes
CREATE INDEX idx_creator_earnings_user_date ON public.creator_earnings(user_id, earned_date);
CREATE INDEX idx_creator_withdrawals_user_status ON public.creator_withdrawals(user_id, status);