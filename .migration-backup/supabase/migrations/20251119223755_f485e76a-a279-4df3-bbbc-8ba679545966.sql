-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update safe profile fields" ON profiles;

-- Create a security definer function to get protected profile fields
CREATE OR REPLACE FUNCTION public.get_protected_profile_fields(p_user_id uuid)
RETURNS TABLE (
  is_business_mode boolean,
  is_verified boolean,
  is_affiliate boolean,
  is_organization_verified boolean,
  is_admin boolean,
  affiliated_business_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.is_business_mode,
    p.is_verified,
    p.is_affiliate,
    p.is_organization_verified,
    p.is_admin,
    p.affiliated_business_id
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$;

-- Create new policy using the security definer function
CREATE POLICY "Users can update safe profile fields" 
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  (
    SELECT 
      is_business_mode = p.is_business_mode AND
      is_verified = p.is_verified AND
      is_affiliate = p.is_affiliate AND
      is_organization_verified = p.is_organization_verified AND
      is_admin = p.is_admin AND
      NOT (affiliated_business_id IS DISTINCT FROM p.affiliated_business_id)
    FROM public.get_protected_profile_fields(auth.uid()) p
  )
);