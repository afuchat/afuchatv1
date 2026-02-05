-- Create storage bucket for AI generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generated-images', 
  'ai-generated-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to view all AI generated images (public bucket)
CREATE POLICY "Anyone can view AI generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-generated-images');

-- Create policy for authenticated users to upload their own images
CREATE POLICY "Authenticated users can upload AI generated images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ai-generated-images' 
  AND auth.role() = 'authenticated'
);

-- Create policy for users to delete their own images
CREATE POLICY "Users can delete their own AI generated images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ai-generated-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);