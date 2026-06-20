-- Update the trigger function to also remove verification for premium-verified users
CREATE OR REPLACE FUNCTION public.check_subscription_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the subscription is being updated and it's expired, mark it inactive
  IF NEW.is_active = true AND NEW.expires_at < now() THEN
    NEW.is_active := false;
    
    -- Also remove verification for users who were verified via premium
    UPDATE public.profiles
    SET is_verified = false
    WHERE id = NEW.user_id
      AND verification_source = 'premium';
  END IF;
  RETURN NEW;
END;
$$;

-- Also fix currently expired subscriptions - remove verification for premium-verified users
UPDATE public.profiles p
SET is_verified = false
WHERE p.verification_source = 'premium'
  AND EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = p.id
      AND us.is_active = false
      AND us.expires_at < now()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = p.id
      AND us.is_active = true
      AND us.expires_at > now()
  );