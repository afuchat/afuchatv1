-- Update distribute function to respect admin view threshold
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
  -- Admins need 50 views, regular users need 500 views
  CREATE TEMP TABLE temp_eligible_creators AS
  SELECT 
    p.id as user_id,
    (get_daily_engagement(p.id, CURRENT_DATE - INTERVAL '1 day')::jsonb->>'score')::INTEGER as score,
    (get_daily_engagement(p.id, CURRENT_DATE - INTERVAL '1 day')::jsonb->>'views')::INTEGER as views,
    (get_daily_engagement(p.id, CURRENT_DATE - INTERVAL '1 day')::jsonb->>'likes')::INTEGER as likes
  FROM profiles p
  WHERE LOWER(p.country) IN ('uganda', 'ug')
    AND (SELECT COUNT(*) FROM follows WHERE following_id = p.id) >= 10
    AND (
      -- Admin users need only 50 views
      (p.is_admin = true AND (SELECT COALESCE(SUM(view_count), 0) FROM posts WHERE author_id = p.id AND created_at >= CURRENT_DATE - INTERVAL '7 days') >= 50)
      OR
      -- Regular users need 500 views
      (COALESCE(p.is_admin, false) = false AND (SELECT COALESCE(SUM(view_count), 0) FROM posts WHERE author_id = p.id AND created_at >= CURRENT_DATE - INTERVAL '7 days') >= 500)
    );
  
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