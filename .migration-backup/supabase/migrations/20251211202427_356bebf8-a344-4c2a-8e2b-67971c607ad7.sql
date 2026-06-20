
-- Create a function to get today's public engagement leaderboard
CREATE OR REPLACE FUNCTION public.get_daily_engagement_leaderboard()
RETURNS TABLE(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_engagement BIGINT := 0;
  v_daily_pool INTEGER := 5000;
BEGIN
  -- Create temp table with today's engagement for all users
  CREATE TEMP TABLE temp_leaderboard AS
  SELECT 
    p.id as user_id,
    p.display_name,
    p.handle,
    p.avatar_url,
    -- Count today's views
    COALESCE((
      SELECT COUNT(*) 
      FROM post_views pv 
      JOIN posts po ON po.id = pv.post_id 
      WHERE po.author_id = p.id 
      AND DATE(pv.viewed_at) = CURRENT_DATE
    ), 0)::BIGINT as views_count,
    -- Count today's likes
    COALESCE((
      SELECT COUNT(*) 
      FROM post_acknowledgments pa 
      JOIN posts po ON po.id = pa.post_id 
      WHERE po.author_id = p.id 
      AND DATE(pa.created_at) = CURRENT_DATE
    ), 0)::BIGINT as likes_count,
    -- Count today's replies
    COALESCE((
      SELECT COUNT(*) 
      FROM post_replies pr 
      JOIN posts po ON po.id = pr.post_id 
      WHERE po.author_id = p.id 
      AND pr.author_id != p.id
      AND DATE(pr.created_at) = CURRENT_DATE
    ), 0)::BIGINT as replies_count
  FROM profiles p;
  
  -- Calculate engagement score
  ALTER TABLE temp_leaderboard ADD COLUMN engagement_score BIGINT DEFAULT 0;
  ALTER TABLE temp_leaderboard ADD COLUMN potential_earnings INTEGER DEFAULT 0;
  
  UPDATE temp_leaderboard
  SET engagement_score = views_count + (likes_count * 2) + (replies_count * 3);
  
  -- Get total engagement
  SELECT COALESCE(SUM(engagement_score), 0) INTO v_total_engagement 
  FROM temp_leaderboard 
  WHERE engagement_score > 0;
  
  -- Calculate potential earnings based on share of pool
  IF v_total_engagement > 0 THEN
    UPDATE temp_leaderboard tl
    SET potential_earnings = FLOOR((tl.engagement_score::DECIMAL / v_total_engagement) * v_daily_pool)
    WHERE tl.engagement_score > 0;
  END IF;
  
  -- Return only users with engagement, ordered by score
  RETURN QUERY
  SELECT 
    tl.user_id,
    tl.display_name,
    tl.handle,
    tl.avatar_url,
    tl.views_count,
    tl.likes_count,
    tl.replies_count,
    tl.engagement_score,
    tl.potential_earnings
  FROM temp_leaderboard tl
  WHERE tl.engagement_score > 0
  ORDER BY tl.engagement_score DESC;
  
  DROP TABLE temp_leaderboard;
END;
$$;

-- Grant execute to all authenticated users (public leaderboard)
GRANT EXECUTE ON FUNCTION public.get_daily_engagement_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_engagement_leaderboard() TO anon;
