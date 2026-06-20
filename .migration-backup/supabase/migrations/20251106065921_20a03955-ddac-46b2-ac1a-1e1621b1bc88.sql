-- Create supported languages table
CREATE TABLE public.supported_languages (
  code text PRIMARY KEY,
  name text NOT NULL,
  native_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert initial supported languages
INSERT INTO public.supported_languages (code, name, native_name) VALUES
  ('en', 'English', 'English'),
  ('es', 'Spanish', 'Español'),
  ('fr', 'French', 'Français'),
  ('ar', 'Arabic', 'العربية'),
  ('sw', 'Swahili', 'Kiswahili');

-- Create user avatars table
CREATE TABLE public.user_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  avatar_config jsonb NOT NULL DEFAULT '{"eyes":"normal","color":"#7456E8","accessories":[],"background":"light","emotion":"smile"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_avatars
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_avatars
CREATE POLICY "Users can view all avatars"
  ON public.user_avatars
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own avatar"
  ON public.user_avatars
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own avatar"
  ON public.user_avatars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add language to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN language text REFERENCES public.supported_languages(code) DEFAULT 'en';

-- Add language_code to posts table
ALTER TABLE public.posts 
  ADD COLUMN language_code text REFERENCES public.supported_languages(code) DEFAULT 'en';

-- Create index for faster language filtering
CREATE INDEX idx_posts_language_code ON public.posts(language_code);
CREATE INDEX idx_profiles_language ON public.profiles(language);

-- Create trigger for updated_at on user_avatars
CREATE TRIGGER update_user_avatars_updated_at
  BEFORE UPDATE ON public.user_avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create avatar on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_avatars (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create avatar when profile is created
CREATE TRIGGER on_profile_created_avatar
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_avatar();