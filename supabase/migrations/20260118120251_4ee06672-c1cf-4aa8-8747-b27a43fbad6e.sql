-- Create storage bucket for AI chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-chat-attachments',
  'ai-chat-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for AI chat attachments
CREATE POLICY "Users can upload AI chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "AI chat attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-chat-attachments');

CREATE POLICY "Users can delete their own AI chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'ai-chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);