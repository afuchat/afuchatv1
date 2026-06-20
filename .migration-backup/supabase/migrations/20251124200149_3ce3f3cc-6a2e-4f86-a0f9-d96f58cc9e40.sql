-- Create function to auto-verify users when they subscribe to premium
CREATE OR REPLACE FUNCTION public.auto_verify_premium_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if the subscription is active and not expired
  IF NEW.is_active = true AND NEW.expires_at > NOW() THEN
    -- Automatically set user as verified when they have an active premium subscription
    UPDATE public.profiles
    SET is_verified = true
    WHERE id = NEW.user_id AND is_verified = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-verify users on subscription insert or update
DROP TRIGGER IF EXISTS auto_verify_on_premium_subscription ON public.user_subscriptions;
CREATE TRIGGER auto_verify_on_premium_subscription
  AFTER INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_verify_premium_user();