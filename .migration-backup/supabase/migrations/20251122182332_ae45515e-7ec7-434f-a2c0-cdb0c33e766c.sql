-- Create notification_preferences table for storing user notification settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email notification preferences
  email_enabled BOOLEAN DEFAULT true,
  email_messages BOOLEAN DEFAULT true,
  email_likes BOOLEAN DEFAULT true,
  email_follows BOOLEAN DEFAULT true,
  email_gifts BOOLEAN DEFAULT true,
  email_mentions BOOLEAN DEFAULT true,
  email_replies BOOLEAN DEFAULT true,
  
  -- Email digest preferences
  email_digest_frequency TEXT DEFAULT 'instant', -- instant, daily, weekly, never
  
  -- Push notification preferences
  push_enabled BOOLEAN DEFAULT true,
  push_messages BOOLEAN DEFAULT true,
  push_likes BOOLEAN DEFAULT true,
  push_follows BOOLEAN DEFAULT true,
  push_gifts BOOLEAN DEFAULT true,
  push_mentions BOOLEAN DEFAULT true,
  push_replies BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own notification preferences
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notification preferences
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to automatically create default preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when a new profile is created
CREATE TRIGGER create_notification_preferences_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Add updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();