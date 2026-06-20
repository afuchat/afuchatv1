-- Drop the SECURITY DEFINER view and recreate as SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate as a regular view (SECURITY INVOKER is default, which is safe)
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
  current_grade,
  CASE WHEN show_balance = true THEN xp ELSE 0 END as xp,
  country,
  business_category,
  is_private,
  created_at
FROM profiles
WHERE is_private = false OR is_private IS NULL;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;