-- Make url column nullable to allow APK-only apps
ALTER TABLE public.mini_programs ALTER COLUMN url DROP NOT NULL;