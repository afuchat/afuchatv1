-- Fix privilege escalation vulnerability in profiles table
-- Drop the overly permissive policy that allows updating any field
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create restricted policy that only allows updating safe fields
CREATE POLICY "Users can update safe profile fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from modifying sensitive privilege fields
  is_business_mode = (SELECT is_business_mode FROM public.profiles WHERE id = auth.uid()) AND
  is_verified = (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) AND
  is_affiliate = (SELECT is_affiliate FROM public.profiles WHERE id = auth.uid()) AND
  is_organization_verified = (SELECT is_organization_verified FROM public.profiles WHERE id = auth.uid()) AND
  is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) AND
  affiliated_business_id IS NOT DISTINCT FROM (SELECT affiliated_business_id FROM public.profiles WHERE id = auth.uid())
);

-- Allow admins to update any profile field
CREATE POLICY "Admins can update any profile field"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));