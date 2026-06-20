-- Create chat_preferences table to store user chat customization settings
CREATE TABLE IF NOT EXISTS public.chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Appearance settings
  chat_theme TEXT DEFAULT 'teal',
  wallpaper TEXT DEFAULT 'default',
  bubble_style TEXT DEFAULT 'rounded',
  font_size INTEGER DEFAULT 16 CHECK (font_size >= 12 AND font_size <= 24),
  
  -- Media settings
  sounds_enabled BOOLEAN DEFAULT true,
  auto_download BOOLEAN DEFAULT true,
  media_quality TEXT DEFAULT 'high',
  
  -- Privacy settings
  chat_lock BOOLEAN DEFAULT false,
  read_receipts BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.chat_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_preferences
CREATE POLICY "Users can view own chat preferences"
  ON public.chat_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat preferences"
  ON public.chat_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat preferences"
  ON public.chat_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
CREATE TRIGGER update_chat_preferences_updated_at_trigger
  BEFORE UPDATE ON public.chat_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_preferences_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_chat_preferences_user_id ON public.chat_preferences(user_id);