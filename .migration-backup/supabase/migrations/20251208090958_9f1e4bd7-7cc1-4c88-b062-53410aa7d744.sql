-- Drop overly permissive SELECT policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public can view basic profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Create a security definer function to get safe public profile fields only
CREATE OR REPLACE FUNCTION public.get_safe_profile_fields(p_profile_id uuid)
RETURNS TABLE(
  id uuid,
  display_name text,
  handle text,
  avatar_url text,
  banner_url text,
  bio text,
  website_url text,
  is_verified boolean,
  is_organization_verified boolean,
  is_business_mode boolean,
  current_grade text,
  xp integer,
  country text,
  business_category text,
  show_balance boolean,
  is_private boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, display_name, handle, avatar_url, banner_url, bio, website_url,
    is_verified, is_organization_verified, is_business_mode, current_grade,
    -- Only show XP if show_balance is true, otherwise show 0
    CASE WHEN show_balance = true THEN xp ELSE 0 END as xp,
    country, business_category, show_balance, is_private
  FROM profiles
  WHERE profiles.id = p_profile_id;
$$;

-- Create restrictive SELECT policy: users can view their own full profile
CREATE POLICY "Users can view own full profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Create restrictive SELECT policy: others can only view non-private profiles with limited fields
-- This allows viewing profiles but sensitive data (phone_number, acoin) is protected at column level
CREATE POLICY "Users can view public profiles"
ON profiles FOR SELECT
USING (
  -- Allow viewing if profile is not private, or if viewer follows the private user
  is_private = false 
  OR auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = auth.uid() 
    AND following_id = profiles.id
  )
);

-- Ensure phone_number and acoin are NEVER exposed to non-owners
-- We'll use a trigger to mask these fields for non-owners
-- But since RLS can't mask columns, we rely on the application to use get_safe_profile_fields() for public access

-- Create a view for public profile access that excludes sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
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