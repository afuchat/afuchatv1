-- Create table for AI-generated chat themes
CREATE TABLE IF NOT EXISTS public.chat_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  colors JSONB NOT NULL, -- Stores primary, secondary, accent colors
  generated_prompt TEXT NOT NULL,
  image_url TEXT, -- Optional preview image
  is_premium BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for AI-generated chat wallpapers
CREATE TABLE IF NOT EXISTS public.chat_wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  generated_prompt TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.chat_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_wallpapers ENABLE ROW LEVEL SECURITY;

-- Everyone can view themes and wallpapers
CREATE POLICY "Anyone can view chat themes"
  ON public.chat_themes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view chat wallpapers"
  ON public.chat_wallpapers FOR SELECT
  USING (true);

-- Only admins can insert/update themes and wallpapers (via edge function)
CREATE POLICY "Service role can manage themes"
  ON public.chat_themes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage wallpapers"
  ON public.chat_wallpapers FOR ALL
  USING (auth.role() = 'service_role');

-- Alter chat_preferences to store theme/wallpaper IDs instead of names
ALTER TABLE public.chat_preferences 
  ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.chat_themes(id),
  ADD COLUMN IF NOT EXISTS wallpaper_id UUID REFERENCES public.chat_wallpapers(id);

-- Insert some default free themes
INSERT INTO public.chat_themes (name, colors, generated_prompt, is_premium) VALUES
  ('Default Teal', '{"primary": "#14b8a6", "secondary": "#0d9488", "accent": "#5eead4"}', 'Default theme', false),
  ('Ocean Blue', '{"primary": "#0ea5e9", "secondary": "#0284c7", "accent": "#7dd3fc"}', 'Default theme', false),
  ('Forest Green', '{"primary": "#10b981", "secondary": "#059669", "accent": "#6ee7b7"}', 'Default theme', false);

-- Insert some default free wallpapers
INSERT INTO public.chat_wallpapers (name, image_url, generated_prompt, is_premium) VALUES
  ('Default', 'default', 'Default wallpaper', false),
  ('Gradient Blue', 'gradient-blue', 'Default wallpaper', false),
  ('Dark Pattern', 'dark-pattern', 'Default wallpaper', false);