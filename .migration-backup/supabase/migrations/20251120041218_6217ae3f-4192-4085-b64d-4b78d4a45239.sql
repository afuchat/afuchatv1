-- Drop the policy that depends on the user_role_enum version
DROP POLICY IF EXISTS "Admins read all roles" ON user_roles;

-- Drop the duplicate has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role_enum);

-- Recreate the policy using the app_role version of has_role
CREATE POLICY "Admins read all roles" 
ON user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));