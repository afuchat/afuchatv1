CREATE OR REPLACE FUNCTION check_creator_eligibility(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country TEXT;
  v_follower_count INTEGER;
  v_weekly_views INTEGER;
  v_is_admin BOOLEAN;
  v_required_views INTEGER;
  v_is_eligible BOOLEAN := false;
BEGIN
  -- Get user country and admin status
  SELECT country, COALESCE(is_admin, false) INTO v_country, v_is_admin
  FROM profiles WHERE id = p_user_id;
  
  -- Set views threshold based on admin status
  v_required_views := CASE WHEN v_is_admin THEN 50 ELSE 500 END;
  
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
  
  IF v_weekly_views < v_required_views THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', format('You need at least %s views on your posts in the past week', v_required_views),
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