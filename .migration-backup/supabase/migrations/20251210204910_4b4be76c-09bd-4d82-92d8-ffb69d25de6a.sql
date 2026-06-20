-- Make voice-messages bucket public so audio can be played
UPDATE storage.buckets SET public = true WHERE id = 'voice-messages';

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Public voice messages are accessible to everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice messages" ON storage.objects;

-- Ensure proper RLS policies for public read access
CREATE POLICY "Public voice messages are accessible to everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

-- Allow authenticated users to upload their own voice messages
CREATE POLICY "Users can upload their own voice messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own voice messages
CREATE POLICY "Users can delete their own voice messages"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);