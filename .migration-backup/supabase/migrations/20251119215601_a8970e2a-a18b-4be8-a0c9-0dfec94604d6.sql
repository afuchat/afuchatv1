-- Add attachment columns to messages table first
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Add comment for clarity
COMMENT ON COLUMN messages.attachment_url IS 'Storage path to the attachment file';
COMMENT ON COLUMN messages.attachment_type IS 'MIME type of the attachment';
COMMENT ON COLUMN messages.attachment_name IS 'Original filename of the attachment';
COMMENT ON COLUMN messages.attachment_size IS 'File size in bytes';

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- RLS policies for chat attachments bucket
CREATE POLICY "Users can upload attachments to their chats"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments in their chats"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM messages m
      WHERE m.attachment_url = storage.objects.name
      AND m.chat_id IN (
        SELECT chat_id FROM chat_members WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);