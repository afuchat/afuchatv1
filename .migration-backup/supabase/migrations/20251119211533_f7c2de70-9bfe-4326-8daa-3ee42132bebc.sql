-- Add edited_at column to track message edits
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own messages within time limit" ON messages;

-- Create policy to allow users to update their own recent messages
CREATE POLICY "Users can update their own messages within time limit"
ON messages FOR UPDATE
USING (
  sender_id = auth.uid() 
  AND sent_at > (now() - interval '15 minutes')
)
WITH CHECK (
  sender_id = auth.uid()
);