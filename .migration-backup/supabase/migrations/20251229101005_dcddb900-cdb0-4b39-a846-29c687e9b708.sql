-- Add preferred_language column to telegram_users table
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

-- Add index for faster queries on telegram users
CREATE INDEX IF NOT EXISTS idx_telegram_users_created_at ON public.telegram_users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_users_is_linked ON public.telegram_users(is_linked);
CREATE INDEX IF NOT EXISTS idx_telegram_users_preferred_language ON public.telegram_users(preferred_language);