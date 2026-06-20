
-- Update distribute function: 5000 UGX pool distributed proportionally to ALL with engagement
CREATE OR REPLACE FUNCTION public.distribute_daily_creator_rewards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_pool INTEGER := 5000; -- 5000 UGX daily pool to distribute
  v_total_engagement INTEGER := 0;
  v_creator RECORD;
  v_share_amount INTEGER;
  v_recipients INTEGER := 0;
BEGIN
  -- Create temp table for ALL Ugandan creators with today's engagement
  CREATE TEMP TABLE temp_creators_engagement AS
  SELECT 
    p.id as user_id,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'views')::INTEGER as views,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'likes')::INTEGER as likes,
    (get_daily_engagement(p.id, CURRENT_DATE)::jsonb->>'replies')::INTEGER as replies
  FROM profiles p
  WHERE LOWER(p.country) IN ('uganda', 'ug');
  
  -- Calculate total engagement (views + likes*2 + replies*3 for weighting)
  ALTER TABLE temp_creators_engagement ADD COLUMN engagement_score INTEGER DEFAULT 0;
  
  UPDATE temp_creators_engagement
  SET engagement_score = views + (likes * 2) + (replies * 3);
  
  -- Remove users with no engagement
  DELETE FROM temp_creators_engagement WHERE engagement_score <= 0;
  
  -- Get total engagement across all creators
  SELECT COALESCE(SUM(engagement_score), 0) INTO v_total_engagement FROM temp_creators_engagement;
  
  IF v_total_engagement = 0 THEN
    DROP TABLE temp_creators_engagement;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No creators with engagement found today'
    );
  END IF;
  
  -- Distribute 5000 UGX proportionally based on engagement share
  FOR v_creator IN SELECT * FROM temp_creators_engagement LOOP
    -- Calculate share: (user_engagement / total_engagement) * 5000
    v_share_amount := FLOOR((v_creator.engagement_score::DECIMAL / v_total_engagement) * v_daily_pool);
    
    IF v_share_amount > 0 THEN
      -- Record potential earnings for this creator
      INSERT INTO creator_earnings (user_id, amount_ugx, engagement_score, views_count, likes_count, earned_date)
      VALUES (
        v_creator.user_id, 
        v_share_amount, 
        v_creator.engagement_score,
        v_creator.views, 
        v_creator.likes, 
        CURRENT_DATE
      )
      ON CONFLICT (user_id, earned_date) 
      DO UPDATE SET 
        amount_ugx = v_share_amount,
        engagement_score = v_creator.engagement_score,
        views_count = v_creator.views,
        likes_count = v_creator.likes;
      
      v_recipients := v_recipients + 1;
    END IF;
  END LOOP;
  
  DROP TABLE temp_creators_engagement;
  
  RETURN jsonb_build_object(
    'success', true,
    'daily_pool', v_daily_pool,
    'total_engagement', v_total_engagement,
    'participants', v_recipients
  );
END;
$$;
