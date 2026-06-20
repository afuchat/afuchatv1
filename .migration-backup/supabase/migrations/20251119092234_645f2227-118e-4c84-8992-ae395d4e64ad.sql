-- Fix the remaining overloaded function variants
ALTER FUNCTION public.check_daily_login_streak(uuid) SET search_path = public;
ALTER FUNCTION public.check_profile_completion(uuid) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, user_role_enum) SET search_path = public;
ALTER FUNCTION public.is_chat_admin(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_chat_member(uuid, uuid) SET search_path = public;