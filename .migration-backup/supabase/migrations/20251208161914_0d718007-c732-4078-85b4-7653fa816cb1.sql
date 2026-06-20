-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;

-- The existing "Users can update safe profile fields" policy already uses
-- the security definer function get_protected_profile_fields which avoids recursion.
-- We just need to ensure it's the only UPDATE policy for regular users.

-- Also drop duplicate/redundant policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;