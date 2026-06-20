-- Fix: Each user earns based on their OWN engagement (not shared pool)
-- 5000 UGX is the daily CAP, not a pool to distribute
-- Rates: 1 UGX per view, 2 UGX per like
-- If total exceeds cap, scale down proportionally
-- Ineligible users' earnings are lost, not redistributed

CREATE OR REPLACE FUNCTION public.distribute_daily_creator_rewards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_cap INTEGER := 5000; -- Maximum 5000 UGX daily across all users
  v_rate_per_view INTEGER := 1; -- 1 UGX per view
  v_rate_per_like INTEGER := 2; -- 2 UGX per like
  v_total_earned INTEGER := 0;
  v_scale_factor DECIMAL := 1.0;
  v_creator RECORD;
  v_individual_earning INTEGER;
  v_scaled_earning INTEGER;
  v_recipients INTEGER := 0;
BEGIN
  -- Create temp table for ALL Ugandan creators with today's engagement
  CREATE TEMP TABLE temp_creators_engagement AS
  SELECT 
    p.id as user_id,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'views')::INTEGER as views,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'likes')::INTEGER as likes
  FROM profiles p
  WHERE LOWER(p.country) IN ('uganda', 'ug');
  
  -- Calculate individual earnings based on rates
  ALTER TABLE temp_creators_engagement ADD COLUMN individual_earning INTEGER DEFAULT 0;
  
  UPDATE temp_creators_engagement
  SET individual_earning = (views * v_rate_per_view) + (likes * v_rate_per_like);
  
  -- Remove users with no earnings
  DELETE FROM temp_creators_engagement WHERE individual_earning <= 0;
  
  -- Calculate total earnings
  SELECT COALESCE(SUM(individual_earning), 0) INTO v_total_earned FROM temp_creators_engagement;
  
  IF v_total_earned = 0 THEN
    DROP TABLE temp_creators_engagement;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No creators with engagement found'
    );
  END IF;
  
  -- If total exceeds daily cap, calculate scale factor
  IF v_total_earned > v_daily_cap THEN
    v_scale_factor := v_daily_cap::DECIMAL / v_total_earned;
  END IF;
  
  -- Record potential earnings for each creator (scaled if needed)
  FOR v_creator IN SELECT * FROM temp_creators_engagement LOOP
    -- Apply scale factor if total exceeds cap
    v_scaled_earning := FLOOR(v_creator.individual_earning * v_scale_factor);
    
    IF v_scaled_earning > 0 THEN
      -- Upsert potential earnings (NOT credited to balance yet)
      INSERT INTO creator_earnings (user_id, amount_ugx, engagement_score, views_count, likes_count, earned_date)
      VALUES (
        v_creator.user_id, 
        v_scaled_earning, 
        v_creator.individual_earning, -- Store original as score for reference
        v_creator.views, 
        v_creator.likes, 
        CURRENT_DATE
      )
      ON CONFLICT (user_id, earned_date) 
      DO UPDATE SET 
        amount_ugx = v_scaled_earning,
        engagement_score = v_creator.individual_earning,
        views_count = v_creator.views,
        likes_count = v_creator.likes;
      
      v_recipients := v_recipients + 1;
    END IF;
  END LOOP;
  
  DROP TABLE temp_creators_engagement;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_raw_earned', v_total_earned,
    'daily_cap', v_daily_cap,
    'scale_factor', v_scale_factor,
    'participants', v_recipients
  );
END;
$$;