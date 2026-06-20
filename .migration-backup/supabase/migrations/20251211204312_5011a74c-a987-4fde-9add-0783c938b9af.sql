
-- Add missed_earnings_total column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS missed_earnings_total INTEGER DEFAULT 0;

-- Drop and recreate the leaderboard function with 8am-8pm Uganda time window
DROP FUNCTION IF EXISTS get_daily_engagement_leaderboard();

CREATE OR REPLACE FUNCTION get_daily_engagement_leaderboard()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  handle TEXT,
  avatar_url TEXT,
  views_count BIGINT,
  likes_count BIGINT,
  replies_count BIGINT,
  engagement_score BIGINT,
  potential_earnings INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH 
  -- Calculate today's 8am and 8pm in Uganda time (UTC+3)
  time_window AS (
    SELECT 
      (CURRENT_DATE AT TIME ZONE 'Africa/Kampala' + INTERVAL '8 hours')::timestamptz as pool_start,
      (CURRENT_DATE AT TIME ZONE 'Africa/Kampala' + INTERVAL '20 hours')::timestamptz as pool_end
  ),
  user_engagement AS (
    SELECT 
      p.id as user_id,
      p.display_name,
      p.handle,
      p.avatar_url,
      -- Count views within 8am-8pm window
      COALESCE((
        SELECT COUNT(*) 
        FROM post_views pv 
        JOIN posts po ON po.id = pv.post_id 
        WHERE po.author_id = p.id 
        AND pv.viewed_at >= (SELECT pool_start FROM time_window)
        AND pv.viewed_at < (SELECT pool_end FROM time_window)
      ), 0)::BIGINT as views_count,
      -- Count likes within 8am-8pm window
      COALESCE((
        SELECT COUNT(*) 
        FROM post_acknowledgments pa 
        JOIN posts po ON po.id = pa.post_id 
        WHERE po.author_id = p.id 
        AND pa.created_at >= (SELECT pool_start FROM time_window)
        AND pa.created_at < (SELECT pool_end FROM time_window)
      ), 0)::BIGINT as likes_count,
      -- Count replies within 8am-8pm window (from others)
      COALESCE((
        SELECT COUNT(*) 
        FROM post_replies pr 
        JOIN posts po ON po.id = pr.post_id 
        WHERE po.author_id = p.id 
        AND pr.author_id != p.id
        AND pr.created_at >= (SELECT pool_start FROM time_window)
        AND pr.created_at < (SELECT pool_end FROM time_window)
      ), 0)::BIGINT as replies_count
    FROM profiles p
  ),
  scored AS (
    SELECT 
      ue.*,
      (ue.views_count + (ue.likes_count * 2) + (ue.replies_count * 3))::BIGINT as engagement_score
    FROM user_engagement ue
    WHERE ue.views_count > 0 OR ue.likes_count > 0 OR ue.replies_count > 0
  ),
  total_score AS (
    SELECT COALESCE(SUM(engagement_score), 1) as total FROM scored
  )
  SELECT 
    s.user_id,
    s.display_name,
    s.handle,
    s.avatar_url,
    s.views_count,
    s.likes_count,
    s.replies_count,
    s.engagement_score,
    CASE 
      WHEN (SELECT total FROM total_score) > 0 
      THEN FLOOR((s.engagement_score::DECIMAL / (SELECT total FROM total_score)) * 5000)::INTEGER
      ELSE 0
    END as potential_earnings
  FROM scored s
  ORDER BY s.engagement_score DESC;
$$;

-- Create function to credit daily earnings (to be called at 8pm Uganda time)
CREATE OR REPLACE FUNCTION credit_daily_creator_earnings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_pool INTEGER := 5000;
  v_total_engagement BIGINT := 0;
  v_creator RECORD;
  v_share_amount INTEGER;
  v_credited_count INTEGER := 0;
  v_missed_count INTEGER := 0;
  v_is_eligible BOOLEAN;
  v_eligibility jsonb;
BEGIN
  -- Get all users with engagement today (from the leaderboard function)
  FOR v_creator IN 
    SELECT * FROM get_daily_engagement_leaderboard()
  LOOP
    -- Check if user is eligible
    SELECT check_creator_eligibility(v_creator.user_id) INTO v_eligibility;
    v_is_eligible := (v_eligibility->>'eligible')::boolean;
    
    IF v_is_eligible THEN
      -- Credit earnings to eligible users
      UPDATE profiles
      SET available_balance_ugx = COALESCE(available_balance_ugx, 0) + v_creator.potential_earnings
      WHERE id = v_creator.user_id;
      
      -- Record the earning
      INSERT INTO creator_earnings (user_id, amount_ugx, earned_date, engagement_score, views_count, likes_count)
      VALUES (
        v_creator.user_id,
        v_creator.potential_earnings,
        CURRENT_DATE,
        v_creator.engagement_score,
        v_creator.views_count,
        v_creator.likes_count
      )
      ON CONFLICT DO NOTHING;
      
      v_credited_count := v_credited_count + 1;
    ELSE
      -- Add to missed earnings for ineligible users
      UPDATE profiles
      SET missed_earnings_total = COALESCE(missed_earnings_total, 0) + v_creator.potential_earnings
      WHERE id = v_creator.user_id;
      
      v_missed_count := v_missed_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'credited_count', v_credited_count,
    'missed_count', v_missed_count,
    'pool_amount', v_daily_pool,
    'processed_at', NOW()
  );
END;
$$;

-- Get pool status (is pool active, time remaining)
CREATE OR REPLACE FUNCTION get_pool_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'pool_start', (CURRENT_DATE AT TIME ZONE 'Africa/Kampala' + INTERVAL '8 hours')::timestamptz,
    'pool_end', (CURRENT_DATE AT TIME ZONE 'Africa/Kampala' + INTERVAL '20 hours')::timestamptz,
    'current_time', NOW() AT TIME ZONE 'Africa/Kampala',
    'is_pool_active', (
      NOW() AT TIME ZONE 'Africa/Kampala' >= (CURRENT_DATE AT TIME ZONE 'Africa/Kampala' + INTERVAL '8 hours') AND
      NOW() AT TIME ZONE 'Africa/Kampala' < (CURRENT_DATE AT TIME ZONE 'Africa/Kampala' + INTERVAL '20 hours')
    ),
    'timezone', 'Africa/Kampala'
  );
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_daily_engagement_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_engagement_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION get_pool_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pool_status() TO anon;
GRANT EXECUTE ON FUNCTION credit_daily_creator_earnings() TO authenticated;
