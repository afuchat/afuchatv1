-- Add image_url columns to tables that need them
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE mini_programs ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage buckets for different content types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('event-images', 'event-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('restaurant-images', 'restaurant-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('service-images', 'service-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for product-images bucket
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- RLS policies for event-images bucket
CREATE POLICY "Public read access for event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own event images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- RLS policies for restaurant-images bucket
CREATE POLICY "Public read access for restaurant images"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-images');

CREATE POLICY "Authenticated users can upload restaurant images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'restaurant-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own restaurant images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own restaurant images"
ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-images' AND auth.role() = 'authenticated');

-- RLS policies for service-images bucket
CREATE POLICY "Public read access for service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Authenticated users can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own service images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own service images"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');