-- Create storage bucket for stories
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for stories bucket
CREATE POLICY "Anyone can view stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stories' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own stories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stories' AND
  auth.uid()::text = (storage.foldername(name))[1]
);