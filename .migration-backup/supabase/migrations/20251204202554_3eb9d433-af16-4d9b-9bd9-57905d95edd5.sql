-- Create telegram_users table to link Telegram accounts with AfuChat accounts
CREATE TABLE public.telegram_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  is_linked BOOLEAN DEFAULT false,
  link_token TEXT,
  link_token_expires_at TIMESTAMPTZ,
  current_menu TEXT DEFAULT 'main',
  menu_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own telegram link"
ON public.telegram_users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram link"
ON public.telegram_users
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow service role full access (for edge function)
CREATE POLICY "Service role can manage all telegram users"
ON public.telegram_users
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_telegram_users_telegram_id ON public.telegram_users(telegram_id);
CREATE INDEX idx_telegram_users_user_id ON public.telegram_users(user_id);
CREATE INDEX idx_telegram_users_link_token ON public.telegram_users(link_token) WHERE link_token IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_telegram_users_updated_at
BEFORE UPDATE ON public.telegram_users
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();