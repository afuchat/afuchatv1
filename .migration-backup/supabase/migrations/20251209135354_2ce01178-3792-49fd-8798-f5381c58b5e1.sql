-- Drop and recreate the process_referral_reward function with correct column names
CREATE OR REPLACE FUNCTION public.process_referral_reward(referral_code_input text, new_user_id uuid)
RETURNS TABLE(success boolean, referrer_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_display_name TEXT;
  v_existing_referral UUID;
BEGIN
  -- 1. Find the referrer by matching the referral code to the beginning of their user ID (without hyphens)
  SELECT id, display_name INTO v_referrer_id, v_referrer_display_name
  FROM public.profiles
  WHERE UPPER(REPLACE(id::text, '-', '')) LIKE UPPER(referral_code_input) || '%'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
    RETURN;
  END IF;

  -- 2. Prevent self-referral
  IF v_referrer_id = new_user_id THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
    RETURN;
  END IF;

  -- 3. Check if this user was already referred
  SELECT id INTO v_existing_referral
  FROM public.referrals
  WHERE referred_id = new_user_id;

  IF v_existing_referral IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
    RETURN;
  END IF;

  -- 4. Insert the referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, rewarded)
  VALUES (v_referrer_id, new_user_id, referral_code_input, TRUE);

  -- 5. Award 500 Nexa (XP) to the referrer
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + 500
  WHERE id = v_referrer_id;

  -- 6. Give the new user 1 week free premium subscription (using correct column names)
  INSERT INTO public.user_subscriptions (user_id, started_at, expires_at, is_active, acoin_paid)
  VALUES (
    new_user_id,
    NOW(),
    NOW() + INTERVAL '7 days',
    TRUE,
    0
  )
  ON CONFLICT (user_id) DO UPDATE
  SET is_active = TRUE,
      started_at = NOW(),
      expires_at = GREATEST(user_subscriptions.expires_at, NOW() + INTERVAL '7 days');

  -- 7. Set the new user as verified
  UPDATE public.profiles
  SET is_verified = TRUE
  WHERE id = new_user_id;

  RETURN QUERY SELECT TRUE, v_referrer_display_name;
END;
$$;