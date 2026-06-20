-- Add is_blocked column to posts table for content moderation
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Block posts with external links (not Telegram or AfuChat)
UPDATE public.posts 
SET is_blocked = true, 
    blocked_reason = 'Contains external links. Only Telegram and AfuChat links are permitted.'
WHERE id IN (
  '891a3489-eb3d-4ca0-a676-135ee262a2f3',
  '64692b20-96eb-4620-ad35-be1aa8b868c1',
  'b0a3e60a-f205-474f-adc1-c3ea0a347d35',
  '6106d9ae-2191-4e4f-b691-f1661a3e5c70',
  '5ed4fd80-4b17-4ada-8f82-a0db444f94b7',
  '099284d7-e2a2-4f0a-aba3-463fb7de42e3',
  '63a22d9f-5164-4e35-9007-0398210b846c',
  '09c6b34a-0005-4136-928b-812f6cf664b6'
);

-- Add index for faster filtering of blocked posts
CREATE INDEX IF NOT EXISTS idx_posts_is_blocked ON public.posts(is_blocked);