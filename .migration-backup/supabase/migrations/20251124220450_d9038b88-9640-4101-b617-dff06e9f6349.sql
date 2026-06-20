-- Add image_url column to gifts table to store generated images
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS image_url TEXT;