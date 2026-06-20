-- Add affiliate account fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_affiliate boolean DEFAULT false,
ADD COLUMN affiliate_business_name text,
ADD COLUMN affiliate_business_logo text;

-- Add index for affiliate lookups
CREATE INDEX idx_profiles_is_affiliate ON public.profiles(is_affiliate) WHERE is_affiliate = true;

-- Add RLS policy for admins to manage affiliate status
CREATE POLICY "Admins can update affiliate status"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));