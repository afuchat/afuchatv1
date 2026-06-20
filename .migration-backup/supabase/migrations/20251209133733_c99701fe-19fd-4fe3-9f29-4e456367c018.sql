-- Update referral processing function to work with the new code format
-- Code format: first 12 chars of user ID without hyphens, uppercase

DROP FUNCTION IF EXISTS public.process_referral_reward(text, uuid);

CREATE OR REPLACE FUNCTION public.process_referral_reward(referral_code_input text, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  already_rewarded boolean;
  referral_record_exists boolean;
BEGIN
  -- Find referrer by matching the code to the beginning of their user ID (without hyphens)
  SELECT id INTO referrer_id
  FROM profiles
  WHERE UPPER(REPLACE(id::text, '-', '')) LIKE UPPER(referral_code_input) || '%'
  AND id != new_user_id
  LIMIT 1;
  
  IF referrer_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if this referral was already processed
  SELECT EXISTS(
    SELECT 1 FROM referrals 
    WHERE referrer_id = process_referral_reward.referrer_id 
    AND referred_id = new_user_id
  ) INTO already_rewarded;
  
  IF already_rewarded THEN
    RETURN false;
  END IF;
  
  -- Create the referral record
  INSERT INTO referrals (referrer_id, referred_id, rewarded, created_at)
  VALUES (referrer_id, new_user_id, true, now());
  
  -- Award 500 Nexa to referrer
  UPDATE profiles
  SET xp = COALESCE(xp, 0) + 500
  WHERE id = referrer_id;
  
  -- Give new user 1 week free premium
  INSERT INTO user_subscriptions (user_id, plan_id, started_at, expires_at, is_active)
  SELECT 
    new_user_id,
    id,
    now(),
    now() + interval '7 days',
    true
  FROM subscription_plans 
  WHERE name ILIKE '%premium%' OR name ILIKE '%week%'
  LIMIT 1
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    expires_at = GREATEST(user_subscriptions.expires_at, now() + interval '7 days'),
    is_active = true;
  
  -- Set the new user as verified (premium benefit)
  UPDATE profiles
  SET is_verified = true
  WHERE id = new_user_id;
  
  RETURN true;
END;
$$;