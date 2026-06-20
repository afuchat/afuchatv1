-- Add support for multiple images per post
CREATE TABLE IF NOT EXISTS public.post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images on public posts
CREATE POLICY "Anyone can view post images"
ON public.post_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_images.post_id
  )
);

-- Users can insert images for their own posts
CREATE POLICY "Users can insert images for their posts"
ON public.post_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_images.post_id
    AND posts.author_id = auth.uid()
  )
);

-- Users can delete images from their own posts
CREATE POLICY "Users can delete images from their posts"
ON public.post_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_images.post_id
    AND posts.author_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON public.post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_display_order ON public.post_images(post_id, display_order);