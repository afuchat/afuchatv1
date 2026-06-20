-- Update the leaderboard function to include hide_on_leaderboard
DROP FUNCTION IF EXISTS get_daily_engagement_leaderboard();

CREATE OR REPLACE FUNCTION get_daily_engagement_leaderboard()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  handle TEXT,
  avatar_url TEXT,
  hide_on_leaderboard BOOLEAN,
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
WITH uganda_time AS (
  SELECT 
    (NOW() AT TIME ZONE 'Africa/Kampala') AS current_time_ug,
    EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Africa/Kampala'))::INTEGER AS current_hour
),
pool_window AS (
  SELECT 
    CASE 
      WHEN ut.current_hour >= 8 AND ut.current_hour < 20 THEN
        DATE_TRUNC('day', ut.current_time_ug) + INTERVAL '8 hours'
      WHEN ut.current_hour < 8 THEN
        DATE_TRUNC('day', ut.current_time_ug - INTERVAL '1 day') + INTERVAL '8 hours'
      ELSE
        DATE_TRUNC('day', ut.current_time_ug) + INTERVAL '8 hours'
    END AS pool_start,
    CASE 
      WHEN ut.current_hour >= 8 AND ut.current_hour < 20 THEN
        DATE_TRUNC('day', ut.current_time_ug) + INTERVAL '20 hours'
      WHEN ut.current_hour < 8 THEN
        DATE_TRUNC('day', ut.current_time_ug - INTERVAL '1 day') + INTERVAL '20 hours'
      ELSE
        DATE_TRUNC('day', ut.current_time_ug) + INTERVAL '20 hours'
    END AS pool_end
  FROM uganda_time ut
),
user_views AS (
  SELECT 
    p.author_id,
    COUNT(pv.id) AS views_count
  FROM posts p
  JOIN post_views pv ON pv.post_id = p.id
  CROSS JOIN pool_window pw
  WHERE pv.viewed_at >= (pw.pool_start AT TIME ZONE 'Africa/Kampala')
    AND pv.viewed_at < (pw.pool_end AT TIME ZONE 'Africa/Kampala')
  GROUP BY p.author_id
),
user_likes AS (
  SELECT 
    p.author_id,
    COUNT(pa.id) AS likes_count
  FROM posts p
  JOIN post_acknowledgments pa ON pa.post_id = p.id
  CROSS JOIN pool_window pw
  WHERE pa.created_at >= (pw.pool_start AT TIME ZONE 'Africa/Kampala')
    AND pa.created_at < (pw.pool_end AT TIME ZONE 'Africa/Kampala')
  GROUP BY p.author_id
),
user_replies AS (
  SELECT 
    p.author_id,
    COUNT(pr.id) AS replies_count
  FROM posts p
  JOIN post_replies pr ON pr.post_id = p.id
  CROSS JOIN pool_window pw
  WHERE pr.created_at >= (pw.pool_start AT TIME ZONE 'Africa/Kampala')
    AND pr.created_at < (pw.pool_end AT TIME ZONE 'Africa/Kampala')
  GROUP BY p.author_id
),
combined AS (
  SELECT 
    COALESCE(uv.author_id, ul.author_id, ur.author_id) AS author_id,
    COALESCE(uv.views_count, 0) AS views_count,
    COALESCE(ul.likes_count, 0) AS likes_count,
    COALESCE(ur.replies_count, 0) AS replies_count
  FROM user_views uv
  FULL OUTER JOIN user_likes ul ON uv.author_id = ul.author_id
  FULL OUTER JOIN user_replies ur ON COALESCE(uv.author_id, ul.author_id) = ur.author_id
),
with_scores AS (
  SELECT 
    c.author_id,
    c.views_count,
    c.likes_count,
    c.replies_count,
    (c.views_count + c.likes_count * 2 + c.replies_count * 3) AS engagement_score
  FROM combined c
  WHERE (c.views_count + c.likes_count * 2 + c.replies_count * 3) > 0
),
total_score AS (
  SELECT SUM(ws.engagement_score) AS total FROM with_scores ws
)
SELECT 
  ws.author_id AS user_id,
  prof.display_name,
  prof.handle,
  prof.avatar_url,
  COALESCE(prof.hide_on_leaderboard, false) AS hide_on_leaderboard,
  ws.views_count,
  ws.likes_count,
  ws.replies_count,
  ws.engagement_score,
  CASE 
    WHEN ts.total > 0 THEN 
      ROUND((ws.engagement_score::NUMERIC / ts.total::NUMERIC) * 5000)::INTEGER
    ELSE 0
  END AS potential_earnings
FROM with_scores ws
CROSS JOIN total_score ts
JOIN profiles prof ON prof.id = ws.author_id
ORDER BY ws.engagement_score DESC;
$$;

GRANT EXECUTE ON FUNCTION get_daily_engagement_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_engagement_leaderboard() TO anon;