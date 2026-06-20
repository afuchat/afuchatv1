-- Add is_verified column to chats table for group verification
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;