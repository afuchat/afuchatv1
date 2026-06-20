-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.process_referral_reward(uuid);
DROP FUNCTION IF EXISTS public.process_referral_reward(text, uuid);

CREATE OR REPLACE FUNCTION public.process_referral_reward(
  referral_code_input TEXT,
  new_user_id UUID
)
RETURNS TABLE(success BOOLEAN, referrer_name TEXT)
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
  WHERE UPPER(REPLACE(id::text, '-', '')) LIKE referral_code_input || '%'
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

  -- 6. Give the new user 1 week free premium subscription
  INSERT INTO public.user_subscriptions (user_id, plan_name, status, starts_at, expires_at, acoin_paid)
  VALUES (
    new_user_id,
    'Referral Premium',
    'active',
    NOW(),
    NOW() + INTERVAL '7 days',
    0
  )
  ON CONFLICT (user_id) DO UPDATE
  SET plan_name = 'Referral Premium',
      status = 'active',
      starts_at = NOW(),
      expires_at = GREATEST(user_subscriptions.expires_at, NOW() + INTERVAL '7 days');

  -- 7. Set the new user as verified
  UPDATE public.profiles
  SET is_verified = TRUE
  WHERE id = new_user_id;

  RETURN QUERY SELECT TRUE, v_referrer_display_name;
END;
$$;