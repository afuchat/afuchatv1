-- Fix search_path security warning for the new functions
ALTER FUNCTION public.record_login_attempt(UUID, BOOLEAN, TEXT, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.upsert_active_session(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = public;