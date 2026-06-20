-- Update merchant logo_url to use public path that's accessible to all users
UPDATE public.merchants 
SET logo_url = '/shopshack-logo.png'
WHERE id = '3e75ceb8-e9c1-4399-93c0-5b8620f40fda';