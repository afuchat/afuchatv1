-- Fix Security Definer View - use SECURITY INVOKER instead
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  handle,
  avatar_url,
  banner_url,
  bio,
  website_url,
  is_verified,
  is_organization_verified,
  is_business_mode,
  business_category,
  country,
  xp,
  current_grade,
  created_at,
  is_private,
  hide_on_leaderboard,
  is_banned,
  is_warned,
  warning_reason,
  warned_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;