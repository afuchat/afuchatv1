-- Add description and avatar_url columns to chats table for group information
ALTER TABLE chats ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_chats_is_group ON chats(is_group);