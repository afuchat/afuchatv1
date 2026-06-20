-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Allow public read access
CREATE POLICY "Anyone can view listing images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'listing-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own listing images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);