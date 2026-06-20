-- Insert ShopShach merchant
INSERT INTO public.merchants (
  name,
  description,
  logo_url,
  api_endpoint,
  commission_rate,
  is_active,
  user_id
) VALUES (
  'ShopShach',
  'Quality products at great prices',
  'https://shopshach.lovable.app/logo.png',
  'https://shopshach.lovable.app',
  5.00,
  true,
  '629333cf-087e-4283-8a09-a44282dda98b'
) ON CONFLICT DO NOTHING;