-- Update the process_referral_reward function to give:
-- 1. 500 Nexa to the referrer
-- 2. 1 week free premium to both referrer and new user

CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referral_code text, p_referred_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_xp_awarded INTEGER := 500; -- 500 Nexa for referrer
  v_premium_days INTEGER := 7; -- 1 week free premium
  v_referrer_has_premium BOOLEAN;
  v_referred_has_premium BOOLEAN;
  v_plan_id uuid;
BEGIN
  -- Find the referral
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referral_code = p_referral_code
    AND referred_id = p_referred_id
    AND rewarded = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Referral not found or already rewarded'
    );
  END IF;
  
  -- Get a plan_id (use the monthly plan as a reference for free premium)
  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true LIMIT 1;
  
  -- Award 500 Nexa (XP) to referrer
  UPDATE public.profiles
  SET xp = xp + v_xp_awarded
  WHERE id = v_referral.referrer_id;
  
  -- Check if referrer already has active premium
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = v_referral.referrer_id 
      AND is_active = true 
      AND expires_at > now()
  ) INTO v_referrer_has_premium;
  
  -- Give or extend premium to referrer
  IF v_referrer_has_premium THEN
    -- Extend existing subscription by 1 week
    UPDATE public.user_subscriptions
    SET expires_at = expires_at + INTERVAL '7 days'
    WHERE user_id = v_referral.referrer_id 
      AND is_active = true
      AND expires_at > now();
  ELSE
    -- Create new 1-week subscription for referrer
    INSERT INTO public.user_subscriptions (user_id, plan_id, started_at, expires_at, is_active, acoin_paid)
    VALUES (v_referral.referrer_id, v_plan_id, now(), now() + INTERVAL '7 days', true, 0);
    
    -- Grant verified status to referrer
    UPDATE public.profiles SET is_verified = true WHERE id = v_referral.referrer_id;
  END IF;
  
  -- Check if referred user already has active premium
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = p_referred_id 
      AND is_active = true 
      AND expires_at > now()
  ) INTO v_referred_has_premium;
  
  -- Give or extend premium to referred user
  IF v_referred_has_premium THEN
    -- Extend existing subscription by 1 week
    UPDATE public.user_subscriptions
    SET expires_at = expires_at + INTERVAL '7 days'
    WHERE user_id = p_referred_id 
      AND is_active = true
      AND expires_at > now();
  ELSE
    -- Create new 1-week subscription for referred user
    INSERT INTO public.user_subscriptions (user_id, plan_id, started_at, expires_at, is_active, acoin_paid)
    VALUES (p_referred_id, v_plan_id, now(), now() + INTERVAL '7 days', true, 0);
    
    -- Grant verified status to referred user
    UPDATE public.profiles SET is_verified = true WHERE id = p_referred_id;
  END IF;
  
  -- Mark referral as rewarded
  UPDATE public.referrals
  SET rewarded = true
  WHERE id = v_referral.id;
  
  -- Log activity for referrer
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (
    v_referral.referrer_id,
    'referral_reward',
    v_xp_awarded,
    jsonb_build_object(
      'referred_user_id', p_referred_id,
      'premium_days_awarded', v_premium_days
    )
  );
  
  -- Log activity for referred user
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (
    p_referred_id,
    'referral_bonus',
    0,
    jsonb_build_object(
      'referrer_id', v_referral.referrer_id,
      'premium_days_awarded', v_premium_days
    )
  );
  
  -- Check for referral achievements
  DECLARE
    v_referral_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_referral_count
    FROM public.referrals
    WHERE referrer_id = v_referral.referrer_id AND rewarded = true;
    
    IF v_referral_count = 5 AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements 
      WHERE user_id = v_referral.referrer_id AND achievement_type = '5_referrals'
    ) THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
      VALUES (v_referral.referrer_id, '5_referrals', jsonb_build_object('count', v_referral_count));
    END IF;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', v_xp_awarded,
    'premium_days', v_premium_days,
    'message', 'Referral reward processed! Both users received 1 week free premium.'
  );
END;
$$;