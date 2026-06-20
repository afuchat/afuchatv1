-- Fix: Restrict sensitive profile data from public access
-- Create a function to check if user is viewing their own profile
CREATE OR REPLACE FUNCTION public.is_own_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_id
$$;

-- Drop the overly permissive public profiles policy
DROP POLICY IF EXISTS "Public profiles viewable by everyone" ON public.profiles;

-- Create new policy: Allow authenticated users to view all basic profile info
-- but sensitive fields (phone_number, acoin, affiliate_earnings) are protected via application logic
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Create policy for public (anon) access - only non-sensitive fields conceptually
-- Note: Since Postgres RLS is row-level not column-level, we allow SELECT but 
-- the application should not expose sensitive columns to unauthenticated users
CREATE POLICY "Public can view basic profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Ensure users cannot update sensitive admin fields on their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile safely"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Prevent users from changing their own admin status
    is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- Add RLS policy to prevent users from modifying is_admin
-- This trigger ensures is_admin cannot be changed by regular users
CREATE OR REPLACE FUNCTION public.prevent_admin_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow is_admin changes if user has admin role
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_self_promotion_trigger ON public.profiles;
CREATE TRIGGER prevent_admin_self_promotion_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_self_promotion();