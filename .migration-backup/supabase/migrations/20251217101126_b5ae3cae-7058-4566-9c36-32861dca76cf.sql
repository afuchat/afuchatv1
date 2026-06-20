-- Update process_referral_reward to grant platinum tier for referred users
CREATE OR REPLACE FUNCTION public.process_referral_reward(referrer_id uuid, new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_exists boolean;
  already_processed boolean;
BEGIN
  -- Check if referrer exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = referrer_id) INTO referrer_exists;
  IF NOT referrer_exists THEN
    RAISE EXCEPTION 'Referrer not found';
  END IF;

  -- Check if this referral was already processed
  SELECT EXISTS(
    SELECT 1 FROM referrals 
    WHERE referrals.referrer_id = process_referral_reward.referrer_id 
    AND referred_user_id = new_user_id 
    AND reward_claimed = true
  ) INTO already_processed;
  
  IF already_processed THEN
    RETURN;
  END IF;

  -- Award 500 Nexa to referrer
  UPDATE profiles 
  SET nexa_points = COALESCE(nexa_points, 0) + 500
  WHERE id = referrer_id;

  -- Grant 1 week PLATINUM premium to new user
  INSERT INTO user_subscriptions (user_id, tier, plan_name, started_at, expires_at, is_active)
  VALUES (
    new_user_id, 
    'platinum',
    'Referral Platinum Week',
    now(), 
    now() + interval '7 days',
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = 'platinum',
    plan_name = 'Referral Platinum Week',
    started_at = now(),
    expires_at = now() + interval '7 days',
    is_active = true;

  -- Set new user as verified with premium source
  UPDATE profiles 
  SET is_verified = true,
      verification_source = 'premium'
  WHERE id = new_user_id;

  -- Set referrer as verified if not already
  UPDATE profiles 
  SET is_verified = true,
      verification_source = COALESCE(verification_source, 'premium')
  WHERE id = referrer_id AND is_verified = false;

  -- Mark referral as rewarded
  UPDATE referrals 
  SET reward_claimed = true,
      reward_claimed_at = now()
  WHERE referrals.referrer_id = process_referral_reward.referrer_id 
  AND referred_user_id = new_user_id;

END;
$$;