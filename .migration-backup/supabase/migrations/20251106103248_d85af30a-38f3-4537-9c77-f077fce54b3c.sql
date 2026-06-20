-- Fix admin operations by adding proper RLS policies using the existing has_role function
-- Using explicit type cast to app_role enum to avoid function ambiguity

-- Allow admins to update any profile verification status
CREATE POLICY "Admins can update profile verification"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage user roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any post
CREATE POLICY "Admins can delete any post"
ON public.posts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix supported_languages table access - add public read policy
CREATE POLICY "Anyone can view supported languages"
ON public.supported_languages FOR SELECT
USING (true);