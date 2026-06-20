-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  false,
  5242880, -- 5MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own voice messages
CREATE POLICY "Users can upload voice messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view voice messages in their chats
CREATE POLICY "Users can view voice messages in their chats"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages' AND
  EXISTS (
    SELECT 1 FROM messages m
    INNER JOIN chat_members cm ON cm.chat_id = m.chat_id
    WHERE m.audio_url LIKE '%' || storage.objects.name || '%'
    AND cm.user_id = auth.uid()
  )
);

-- Policy: Users can delete their own voice messages
CREATE POLICY "Users can delete own voice messages"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);