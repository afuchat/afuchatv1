-- Fix RLS policies for profile-banners bucket
-- Allow users to upload their own banner
CREATE POLICY "Users can upload their own banner"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own banner
CREATE POLICY "Users can update their own banner"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own banner
CREATE POLICY "Users can delete their own banner"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view banners (public bucket)
CREATE POLICY "Anyone can view banners"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-banners');