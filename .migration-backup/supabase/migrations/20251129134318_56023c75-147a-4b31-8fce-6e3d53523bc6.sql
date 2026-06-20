-- Update profile completion check to require phone number and country for rewards
CREATE OR REPLACE FUNCTION public.check_profile_completion(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_is_complete BOOLEAN;
  v_xp_awarded INTEGER := 0;
BEGIN
  -- Get profile data
  SELECT 
    display_name,
    handle,
    bio,
    phone_number,
    country,
    profile_completion_rewarded
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check if already rewarded
  IF v_profile.profile_completion_rewarded THEN
    RETURN jsonb_build_object(
      'completed', true,
      'xp_awarded', 0,
      'message', 'Profile completion already rewarded'
    );
  END IF;
  
  -- Check if profile is FULLY complete (including phone and country)
  v_is_complete := (
    v_profile.display_name IS NOT NULL AND LENGTH(TRIM(v_profile.display_name)) > 0 AND
    v_profile.handle IS NOT NULL AND LENGTH(TRIM(v_profile.handle)) > 0 AND
    v_profile.bio IS NOT NULL AND LENGTH(TRIM(v_profile.bio)) > 0 AND
    v_profile.phone_number IS NOT NULL AND LENGTH(TRIM(v_profile.phone_number)) > 0 AND
    v_profile.country IS NOT NULL AND LENGTH(TRIM(v_profile.country)) > 0
  );
  
  IF v_is_complete THEN
    v_xp_awarded := 100;
    
    -- Update profile
    UPDATE public.profiles
    SET 
      profile_completion_rewarded = true,
      xp = xp + v_xp_awarded
    WHERE id = p_user_id;
    
    -- Log activity
    INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
    VALUES (p_user_id, 'complete_profile', v_xp_awarded, '{}'::jsonb);
    
    -- Award achievement
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, 'profile_completed', '{}'::jsonb)
    ON CONFLICT DO NOTHING;
    
    RETURN jsonb_build_object(
      'completed', true,
      'xp_awarded', v_xp_awarded,
      'message', 'Profile completion reward claimed!'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'completed', false,
    'xp_awarded', 0,
    'message', 'Complete your profile (phone, country, bio) to earn rewards'
  );
END;
$$;