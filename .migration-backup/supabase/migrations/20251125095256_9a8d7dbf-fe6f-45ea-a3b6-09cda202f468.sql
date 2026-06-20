-- Remove the basic themes and wallpapers
DELETE FROM public.chat_themes WHERE generated_prompt = 'Default theme';
DELETE FROM public.chat_wallpapers WHERE generated_prompt = 'Default wallpaper';

-- Add professional, rich themes (some free, some premium)
INSERT INTO public.chat_themes (name, colors, generated_prompt, is_premium) VALUES
  ('Midnight Blue', '{"primary": "#1e3a8a", "secondary": "#1e40af", "accent": "#3b82f6", "background": "#0f172a", "text": "#e2e8f0"}', 'Professional dark blue theme', false),
  ('Royal Purple', '{"primary": "#581c87", "secondary": "#6b21a8", "accent": "#a855f7", "background": "#1e1b4b", "text": "#e9d5ff"}', 'Elegant purple theme', true),
  ('Forest Elite', '{"primary": "#14532d", "secondary": "#166534", "accent": "#22c55e", "background": "#052e16", "text": "#d1fae5"}', 'Premium forest green theme', true),
  ('Sunset Gold', '{"primary": "#92400e", "secondary": "#b45309", "accent": "#f59e0b", "background": "#451a03", "text": "#fef3c7"}', 'Luxurious gold theme', true),
  ('Ocean Deep', '{"primary": "#083344", "secondary": "#155e75", "accent": "#06b6d4", "background": "#0c4a6e", "text": "#cffafe"}', 'Deep ocean blue theme', false),
  ('Rose Elegance', '{"primary": "#881337", "secondary": "#9f1239", "accent": "#f43f5e", "background": "#4c0519", "text": "#ffe4e6"}', 'Elegant rose theme', true),
  ('Charcoal Pro', '{"primary": "#18181b", "secondary": "#27272a", "accent": "#71717a", "background": "#09090b", "text": "#fafafa"}', 'Professional dark theme', false),
  ('Emerald Luxury', '{"primary": "#064e3b", "secondary": "#065f46", "accent": "#10b981", "background": "#022c22", "text": "#d1fae5"}', 'Luxury emerald theme', true),
  ('Sapphire Elite', '{"primary": "#1e3a8a", "secondary": "#1e40af", "accent": "#60a5fa", "background": "#172554", "text": "#dbeafe"}', 'Elite sapphire theme', true),
  ('Crimson Premium', '{"primary": "#7f1d1d", "secondary": "#991b1b", "accent": "#ef4444", "background": "#450a0a", "text": "#fee2e2"}', 'Premium crimson theme', true),
  ('Slate Modern', '{"primary": "#1e293b", "secondary": "#334155", "accent": "#64748b", "background": "#0f172a", "text": "#f1f5f9"}', 'Modern slate theme', false),
  ('Amber Prestige', '{"primary": "#78350f", "secondary": "#92400e", "accent": "#f59e0b", "background": "#451a03", "text": "#fef3c7"}', 'Prestige amber theme', true);

-- Add professional wallpapers with actual CSS gradients (some free, some premium)
INSERT INTO public.chat_wallpapers (name, image_url, generated_prompt, is_premium) VALUES
  ('Aurora Borealis', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'Purple aurora gradient', false),
  ('Deep Ocean', 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', 'Deep ocean gradient', false),
  ('Sunset Horizon', 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', 'Sunset gradient', false),
  ('Royal Velvet', 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', 'Premium royal blue gradient', true),
  ('Golden Hour', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 'Golden hour gradient', true),
  ('Emerald Forest', 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', 'Forest gradient', false),
  ('Midnight Storm', 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)', 'Premium storm gradient', true),
  ('Rose Gold', 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', 'Premium rose gold gradient', true),
  ('Arctic Ice', 'linear-gradient(135deg, #4b79a1 0%, #283e51 100%)', 'Arctic gradient', false),
  ('Crimson Dusk', 'linear-gradient(135deg, #c31432 0%, #240b36 100%)', 'Premium crimson gradient', true),
  ('Mystic Purple', 'linear-gradient(135deg, #6a3093 0%, #a044ff 100%)', 'Premium purple gradient', true),
  ('Ocean Breeze', 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', 'Ocean breeze gradient', false);