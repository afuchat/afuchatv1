-- Create profile-banners storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-banners', 'profile-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public banner access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own banners" ON storage.objects;

-- Policy: Anyone can view banners (public bucket)
CREATE POLICY "Public banner access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-banners');

-- Policy: Users can upload their own banners
CREATE POLICY "Users can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own banners
CREATE POLICY "Users can update own banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own banners
CREATE POLICY "Users can delete own banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);