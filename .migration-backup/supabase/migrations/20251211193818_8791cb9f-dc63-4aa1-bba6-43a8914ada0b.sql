-- Update distribution to RECORD potential earnings (not credit immediately)
-- Earnings fluctuate throughout the day based on relative engagement
-- Crediting happens separately every 24h for eligible users only

CREATE OR REPLACE FUNCTION public.distribute_daily_creator_rewards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_pool INTEGER := 5000; -- 5000 UGX daily pool shared by all
  v_total_score INTEGER := 0;
  v_eligible_creator RECORD;
  v_creator_share INTEGER;
  v_recipients INTEGER := 0;
BEGIN
  -- Create temp table for ALL creators with today's engagement (regardless of eligibility)
  CREATE TEMP TABLE temp_creators_engagement AS
  SELECT 
    p.id as user_id,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'score')::INTEGER as score,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'views')::INTEGER as views,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'likes')::INTEGER as likes,
    LOWER(p.country) IN ('uganda', 'ug') as is_ugandan
  FROM profiles p;
  
  -- Only include Ugandan users with engagement
  DELETE FROM temp_creators_engagement WHERE score <= 0 OR is_ugandan = false;
  
  -- Calculate total score across all participating creators
  SELECT COALESCE(SUM(score), 0) INTO v_total_score FROM temp_creators_engagement;
  
  IF v_total_score = 0 THEN
    DROP TABLE temp_creators_engagement;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No creators with engagement found'
    );
  END IF;
  
  -- Record potential earnings for each creator (upsert - updates if engagement changes)
  FOR v_eligible_creator IN SELECT * FROM temp_creators_engagement LOOP
    -- Calculate share based on relative engagement (higher engagement = larger share)
    v_creator_share := FLOOR((v_eligible_creator.score::DECIMAL / v_total_score) * v_daily_pool);
    
    IF v_creator_share > 0 THEN
      -- Upsert potential earnings (NOT credited to balance yet)
      INSERT INTO creator_earnings (user_id, amount_ugx, engagement_score, views_count, likes_count, earned_date)
      VALUES (v_eligible_creator.user_id, v_creator_share, v_eligible_creator.score, v_eligible_creator.views, v_eligible_creator.likes, CURRENT_DATE)
      ON CONFLICT (user_id, earned_date) 
      DO UPDATE SET 
        amount_ugx = v_creator_share,
        engagement_score = v_eligible_creator.score,
        views_count = v_eligible_creator.views,
        likes_count = v_eligible_creator.likes;
      
      v_recipients := v_recipients + 1;
    END IF;
  END LOOP;
  
  DROP TABLE temp_creators_engagement;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_pool', v_daily_pool,
    'participants', v_recipients
  );
END;
$$;

-- Add unique constraint for upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creator_earnings_user_date_unique'
  ) THEN
    ALTER TABLE creator_earnings ADD CONSTRAINT creator_earnings_user_date_unique UNIQUE (user_id, earned_date);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create function to credit earnings at 24h mark (called by scheduled job)
CREATE OR REPLACE FUNCTION public.credit_daily_creator_earnings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_earning RECORD;
  v_credited INTEGER := 0;
  v_lost INTEGER := 0;
  v_is_eligible BOOLEAN;
  v_follower_count INTEGER;
  v_weekly_views INTEGER;
  v_is_admin BOOLEAN;
  v_required_views INTEGER;
BEGIN
  -- Process yesterday's uncredited earnings
  FOR v_earning IN 
    SELECT ce.*, p.is_admin, p.country
    FROM creator_earnings ce
    JOIN profiles p ON p.id = ce.user_id
    WHERE ce.earned_date = v_yesterday
  LOOP
    -- Check eligibility at credit time
    v_is_admin := COALESCE(v_earning.is_admin, false);
    v_required_views := CASE WHEN v_is_admin THEN 50 ELSE 500 END;
    
    -- Count followers
    SELECT COUNT(*) INTO v_follower_count
    FROM follows WHERE following_id = v_earning.user_id;
    
    -- Calculate weekly views
    SELECT COALESCE(SUM(view_count), 0) INTO v_weekly_views
    FROM posts
    WHERE author_id = v_earning.user_id
      AND created_at >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Check all eligibility criteria
    v_is_eligible := (
      LOWER(v_earning.country) IN ('uganda', 'ug') AND
      v_follower_count >= 10 AND
      v_weekly_views >= v_required_views
    );
    
    IF v_is_eligible THEN
      -- Credit to balance
      UPDATE profiles
      SET available_balance_ugx = COALESCE(available_balance_ugx, 0) + v_earning.amount_ugx
      WHERE id = v_earning.user_id;
      
      v_credited := v_credited + v_earning.amount_ugx;
    ELSE
      -- Not eligible - earnings are lost (already recorded but not credited)
      v_lost := v_lost + v_earning.amount_ugx;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'date_processed', v_yesterday,
    'credited_ugx', v_credited,
    'lost_ugx', v_lost
  );
END;
$$;