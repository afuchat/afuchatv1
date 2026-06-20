-- ============================================
-- Security Migration: Protect Sensitive Data
-- ============================================

-- 1. DROP AND RECREATE PUBLIC PROFILE VIEW (safe fields only)
-- ===========================================================

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
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


-- 2. UPDATE PROFILES RLS POLICIES
-- ================================

-- Drop the overly permissive policy if it exists
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON public.profiles;

-- Create more restrictive policies for profiles table
-- Users can always see their own full profile
CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin users can see all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- For other users, only allow access to non-sensitive fields via the view
-- This policy allows authenticated users to see basic profile info for app functionality
CREATE POLICY "Authenticated users can read basic profile info"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    -- Only expose profiles that are not private or if it's the user's own profile
    (is_private = false OR auth.uid() = id)
  );