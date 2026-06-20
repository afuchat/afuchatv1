
-- Drop and recreate the referral reward function
-- New user: 1 week free premium
-- Referrer: 500 Nexa only (no premium)

DROP FUNCTION IF EXISTS public.process_referral_reward(text, uuid);

CREATE FUNCTION public.process_referral_reward(referral_code_input text, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  already_rewarded boolean;
BEGIN
  -- Find the referrer by their referral code (which is their user id)
  SELECT id INTO referrer_id
  FROM profiles
  WHERE id::text = referral_code_input;
  
  IF referrer_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if this new user was already rewarded (prevent duplicate rewards)
  SELECT EXISTS(
    SELECT 1 FROM referral_rewards 
    WHERE referrer_id = process_referral_reward.referrer_id 
    AND referred_id = new_user_id
  ) INTO already_rewarded;
  
  IF already_rewarded THEN
    RETURN false;
  END IF;
  
  -- Award 500 Nexa to the referrer only (no premium for referrer)
  UPDATE profiles 
  SET xp = xp + 500 
  WHERE id = referrer_id;
  
  -- Grant 1 week free Premium to the NEW USER ONLY
  INSERT INTO user_subscriptions (user_id, plan_name, started_at, expires_at, is_active)
  VALUES (
    new_user_id,
    'Premium (Referral Bonus)',
    now(),
    now() + interval '1 week',
    true
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    expires_at = GREATEST(user_subscriptions.expires_at, now()) + interval '1 week',
    is_active = true;
  
  -- Grant verified status to new user (since they get premium)
  UPDATE profiles
  SET is_verified = true
  WHERE id = new_user_id;
  
  -- Record the referral reward
  INSERT INTO referral_rewards (referrer_id, referred_id, reward_amount, rewarded_at)
  VALUES (referrer_id, new_user_id, 500, now());
  
  -- Log the XP transaction for the referrer
  INSERT INTO xp_transactions (user_id, action_type, xp_amount, metadata)
  VALUES (referrer_id, 'referral_reward', 500, jsonb_build_object('referred_user_id', new_user_id));
  
  RETURN true;
END;
$$;
