-- Add a policy to allow anyone (including unauthenticated users) to view public profiles
CREATE POLICY "Anyone can view public profiles" 
ON public.profiles 
FOR SELECT 
USING (is_private = false OR is_private IS NULL);