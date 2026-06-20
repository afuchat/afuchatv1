-- Create post-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access for post-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post-images" ON storage.objects;

-- Create RLS policies for the post-images bucket
-- Policy: Public can view all images in post-images bucket
CREATE POLICY "Public Access for post-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- Policy: Authenticated users can insert images
CREATE POLICY "Authenticated users can upload post-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Policy: Users can update their own images
CREATE POLICY "Users can update own post-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'post-images');

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own post-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);