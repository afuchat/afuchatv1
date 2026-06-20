-- Add unique constraint on user_id for telegram_users (for upsert functionality)
CREATE UNIQUE INDEX IF NOT EXISTS telegram_users_user_id_unique ON public.telegram_users(user_id) WHERE user_id IS NOT NULL;

-- Create index on link_token for faster lookups
CREATE INDEX IF NOT EXISTS telegram_users_link_token_idx ON public.telegram_users(link_token) WHERE link_token IS NOT NULL;