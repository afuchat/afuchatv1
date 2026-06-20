-- Update ShopShack profile with the new logo
UPDATE public.profiles 
SET avatar_url = '/src/assets/shopshack-logo.png'
WHERE id = '629333cf-087e-4283-8a09-a44282dda98b';

-- Also update merchant logo
UPDATE public.merchants
SET logo_url = '/src/assets/shopshack-logo.png'
WHERE user_id = '629333cf-087e-4283-8a09-a44282dda98b';