-- Fix the last remaining functions
ALTER FUNCTION public.get_requesting_user() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.is_user_in_chat(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.approve_affiliate_by_business(uuid) SET search_path = public;