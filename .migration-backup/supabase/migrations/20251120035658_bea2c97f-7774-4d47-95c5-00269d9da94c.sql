-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own verification documents
CREATE POLICY "Users can upload verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own verification documents
CREATE POLICY "Users can view their own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to delete their own verification documents
CREATE POLICY "Users can delete their own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);