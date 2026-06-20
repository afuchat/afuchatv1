-- Add more free themes for variety
INSERT INTO public.chat_themes (name, colors, generated_prompt, is_premium) VALUES
  ('Sunset Orange', '{"primary": "#f97316", "secondary": "#ea580c", "accent": "#fb923c"}', 'Default theme', false),
  ('Purple Dream', '{"primary": "#a855f7", "secondary": "#9333ea", "accent": "#c084fc"}', 'Default theme', false),
  ('Rose Pink', '{"primary": "#ec4899", "secondary": "#db2777", "accent": "#f9a8d4"}', 'Default theme', false),
  ('Sky Blue', '{"primary": "#38bdf8", "secondary": "#0284c7", "accent": "#7dd3fc"}', 'Default theme', false),
  ('Emerald Green', '{"primary": "#10b981", "secondary": "#059669", "accent": "#34d399"}', 'Default theme', false),
  ('Amber Gold', '{"primary": "#f59e0b", "secondary": "#d97706", "accent": "#fbbf24"}', 'Default theme', false),
  ('Indigo Night', '{"primary": "#6366f1", "secondary": "#4f46e5", "accent": "#818cf8"}', 'Default theme', false),
  ('Crimson Red', '{"primary": "#ef4444", "secondary": "#dc2626", "accent": "#f87171"}', 'Default theme', false),
  ('Lime Fresh', '{"primary": "#84cc16", "secondary": "#65a30d", "accent": "#a3e635"}', 'Default theme', false),
  ('Cyan Wave', '{"primary": "#06b6d4", "secondary": "#0891b2", "accent": "#22d3ee"}', 'Default theme', false);

-- Add more free wallpapers for variety
INSERT INTO public.chat_wallpapers (name, image_url, generated_prompt, is_premium) VALUES
  ('Ocean Waves', 'gradient-ocean', 'Default wallpaper', false),
  ('Sunset Sky', 'gradient-sunset', 'Default wallpaper', false),
  ('Forest Green', 'gradient-forest', 'Default wallpaper', false),
  ('Purple Haze', 'gradient-purple', 'Default wallpaper', false),
  ('Rose Garden', 'gradient-rose', 'Default wallpaper', false),
  ('Mountain Mist', 'gradient-mountain', 'Default wallpaper', false),
  ('Warm Autumn', 'gradient-autumn', 'Default wallpaper', false),
  ('Cool Winter', 'gradient-winter', 'Default wallpaper', false),
  ('Spring Bloom', 'gradient-spring', 'Default wallpaper', false),
  ('Desert Sand', 'gradient-desert', 'Default wallpaper', false);