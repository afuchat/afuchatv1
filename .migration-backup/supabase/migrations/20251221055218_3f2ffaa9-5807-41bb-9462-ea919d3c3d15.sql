-- Add apk_url column to mini_programs table for Android APK files
ALTER TABLE public.mini_programs 
ADD COLUMN IF NOT EXISTS apk_url TEXT DEFAULT NULL;

-- Add app_type column to distinguish between web apps and native apps
ALTER TABLE public.mini_programs 
ADD COLUMN IF NOT EXISTS app_type TEXT DEFAULT 'web' CHECK (app_type IN ('web', 'android', 'both'));

-- Create storage bucket for APK files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mini-app-apks', 
  'mini-app-apks', 
  true,
  104857600, -- 100MB limit for APK files
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view APK files (they're public downloads)
CREATE POLICY "APK files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'mini-app-apks');

-- Allow authenticated users to upload APK files
CREATE POLICY "Authenticated users can upload APKs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mini-app-apks' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own APK files
CREATE POLICY "Users can update their own APKs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mini-app-apks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own APK files
CREATE POLICY "Users can delete their own APKs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mini-app-apks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);