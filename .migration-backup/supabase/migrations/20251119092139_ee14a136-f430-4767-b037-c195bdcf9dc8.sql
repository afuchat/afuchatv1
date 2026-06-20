-- Fix search_path for SECURITY DEFINER functions to prevent search path manipulation attacks
-- This addresses the security finding: Function Search Path Mutable

-- Functions that need search_path fixed:
ALTER FUNCTION public.award_xp(uuid, text, integer, jsonb) SET search_path = public;
ALTER FUNCTION public.handle_new_follower() SET search_path = public;
ALTER FUNCTION public.handle_new_acknowledgment() SET search_path = public;
ALTER FUNCTION public.handle_new_reply() SET search_path = public;
ALTER FUNCTION public.get_gift_price(uuid) SET search_path = public;
ALTER FUNCTION public.send_gift(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.send_gift_combo(uuid[], uuid, text) SET search_path = public;
ALTER FUNCTION public.handle_afuai_mention() SET search_path = public;
ALTER FUNCTION public.handle_afuai_mention_in_post() SET search_path = public;

-- Also fix calculate_grade for consistency (even though it's not SECURITY DEFINER)
ALTER FUNCTION public.calculate_grade(integer) SET search_path = public;