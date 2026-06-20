-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a fixed version using has_role function which doesn't cause recursion
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));