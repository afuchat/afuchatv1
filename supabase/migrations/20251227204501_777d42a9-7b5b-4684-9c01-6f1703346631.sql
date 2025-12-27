-- Create storage bucket for developer showcase images
INSERT INTO storage.buckets (id, name, public)
VALUES ('developer-showcase', 'developer-showcase', true);

-- Allow authenticated users to upload their own showcase images
CREATE POLICY "Users can upload showcase images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'developer-showcase' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to showcase images
CREATE POLICY "Public can view showcase images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'developer-showcase');

-- Allow users to delete their own showcase images
CREATE POLICY "Users can delete own showcase images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'developer-showcase' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);