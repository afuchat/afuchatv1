
-- Drop the old function
DROP FUNCTION IF EXISTS get_daily_engagement_leaderboard();

-- Create a new function that works without temp tables
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
  WITH user_engagement AS (
    SELECT 
      p.id as user_id,
      p.display_name,
      p.handle,
      p.avatar_url,
      -- Count today's views from post_views
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
      -- Count today's replies (from others)
      COALESCE((
        SELECT COUNT(*) 
        FROM post_replies pr 
        JOIN posts po ON po.id = pr.post_id 
        WHERE po.author_id = p.id 
        AND pr.author_id != p.id
        AND DATE(pr.created_at) = CURRENT_DATE
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

-- Grant access
GRANT EXECUTE ON FUNCTION get_daily_engagement_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_engagement_leaderboard() TO anon;
