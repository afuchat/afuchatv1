-- Update the ShopShach merchant's profile to be the official support account
UPDATE public.profiles 
SET 
  display_name = 'ShopShach',
  handle = 'shopshach',
  bio = '🛍️ Your trusted marketplace for quality products. Official ShopShach support - chat with us for order inquiries!',
  is_verified = true,
  is_business_mode = true,
  business_category = 'retail'
WHERE id = '629333cf-087e-4283-8a09-a44282dda98b';