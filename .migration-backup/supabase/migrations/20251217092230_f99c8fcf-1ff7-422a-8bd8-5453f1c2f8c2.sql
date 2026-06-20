-- Create function to deactivate expired subscriptions
CREATE OR REPLACE FUNCTION public.deactivate_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET is_active = false
  WHERE is_active = true
    AND expires_at < now();
END;
$$;

-- Immediately deactivate all currently expired subscriptions
UPDATE public.user_subscriptions
SET is_active = false
WHERE is_active = true
  AND expires_at < now();

-- Create a trigger function that checks expiration on any subscription access
CREATE OR REPLACE FUNCTION public.check_subscription_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the subscription is being read and it's expired, mark it inactive
  IF NEW.is_active = true AND NEW.expires_at < now() THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-deactivate on update
DROP TRIGGER IF EXISTS trigger_check_subscription_expiration ON public.user_subscriptions;
CREATE TRIGGER trigger_check_subscription_expiration
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_subscription_expiration();