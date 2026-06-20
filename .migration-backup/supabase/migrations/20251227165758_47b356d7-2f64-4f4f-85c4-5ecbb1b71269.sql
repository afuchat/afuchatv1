-- Function to remove affiliate status when user becomes a developer
CREATE OR REPLACE FUNCTION public.remove_affiliate_on_developer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a developer role is granted, remove affiliate status
  UPDATE public.profiles
  SET is_affiliate = false,
      affiliated_business_id = NULL
  WHERE id = NEW.user_id
    AND is_affiliate = true;
  
  RETURN NEW;
END;
$$;

-- Trigger to execute when developer role is inserted
DROP TRIGGER IF EXISTS on_developer_role_granted ON public.developer_roles;
CREATE TRIGGER on_developer_role_granted
  AFTER INSERT ON public.developer_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_affiliate_on_developer();

-- Also remove any pending affiliate requests for developers
CREATE OR REPLACE FUNCTION public.cleanup_affiliate_requests_on_developer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancel any pending affiliate requests
  UPDATE public.affiliate_requests
  SET status = 'rejected',
      notes = 'Auto-rejected: User became a developer'
  WHERE user_id = NEW.user_id
    AND status = 'pending';
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_developer_cleanup_affiliate ON public.developer_roles;
CREATE TRIGGER on_developer_cleanup_affiliate
  AFTER INSERT ON public.developer_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_affiliate_requests_on_developer();