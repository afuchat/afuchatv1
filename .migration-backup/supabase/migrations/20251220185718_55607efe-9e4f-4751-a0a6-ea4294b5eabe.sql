-- Add screenshots column to store multiple preview images
ALTER TABLE public.mini_programs
ADD COLUMN IF NOT EXISTS screenshots TEXT[] DEFAULT '{}';

-- Add features column for key features
ALTER TABLE public.mini_programs
ADD COLUMN IF NOT EXISTS features TEXT DEFAULT NULL;

-- Create storage bucket for mini program assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('mini-programs', 'mini-programs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for mini program assets
CREATE POLICY "Anyone can view mini program assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'mini-programs');

CREATE POLICY "Authenticated users can upload mini program assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mini-programs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own mini program assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'mini-programs' AND auth.uid()::text = (storage.foldername(name))[1]);