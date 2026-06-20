-- Create a function to clean up expired subscriptions and remove premium verification
CREATE OR REPLACE FUNCTION public.cleanup_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate expired subscriptions
  UPDATE public.user_subscriptions
  SET is_active = false
  WHERE is_active = true
    AND expires_at < now();
  
  -- Remove verification for users who were verified via premium and have no active subscription
  UPDATE public.profiles p
  SET is_verified = false
  WHERE p.verification_source = 'premium'
    AND p.is_verified = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_subscriptions us
      WHERE us.user_id = p.id
        AND us.is_active = true
        AND us.expires_at > now()
    );
END;
$$;

-- Run cleanup immediately
SELECT public.cleanup_expired_subscriptions();