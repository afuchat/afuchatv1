-- Fix approve_affiliate overloads - both variants
ALTER FUNCTION public.approve_affiliate_by_business(uuid) SET search_path = public;
ALTER FUNCTION public.approve_affiliate_by_business(uuid, numeric, text) SET search_path = public;

-- Fix create_marketplace_listing overloads
ALTER FUNCTION public.create_marketplace_listing(uuid, integer) SET search_path = public;
ALTER FUNCTION public.create_marketplace_listing(uuid, integer, uuid) SET search_path = public;

-- Fix process_referral_reward overloads  
ALTER FUNCTION public.process_referral_reward(uuid) SET search_path = public;
ALTER FUNCTION public.process_referral_reward(text, uuid) SET search_path = public;