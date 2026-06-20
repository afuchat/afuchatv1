-- Add alt_text column to post_images table
ALTER TABLE public.post_images
ADD COLUMN IF NOT EXISTS alt_text TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.post_images.alt_text IS 'AI-generated or user-provided alternative text for accessibility';

-- Create index for searching alt text
CREATE INDEX IF NOT EXISTS idx_post_images_alt_text ON public.post_images USING gin(to_tsvector('english', alt_text)) WHERE alt_text IS NOT NULL;