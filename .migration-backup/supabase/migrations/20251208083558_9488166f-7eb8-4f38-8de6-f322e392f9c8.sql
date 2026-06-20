-- Fix policies that may already exist by dropping and recreating them
DROP POLICY IF EXISTS "Users can view own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification documents" ON storage.objects;

-- Fix 1: Make verification-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'verification-documents';

-- Fix 2: Add restrictive RLS policies for verification-documents storage
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Fix 3: Create a security definer function to get public profile fields only
CREATE OR REPLACE FUNCTION public.get_public_profile(p_profile_id uuid)
RETURNS TABLE (
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
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, display_name, handle, avatar_url, banner_url, bio, website_url,
    is_verified, is_organization_verified, is_business_mode, current_grade, xp, country
  FROM profiles
  WHERE profiles.id = p_profile_id;
$$;

-- Fix 4: Remove overly permissive affiliate request policy
DROP POLICY IF EXISTS "Anyone can view approved affiliate requests" ON public.affiliate_requests;