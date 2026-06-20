-- Add quoted_post_id column to posts table for quote posts
ALTER TABLE public.posts 
ADD COLUMN quoted_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;

-- Create index for efficient quoted post lookups
CREATE INDEX idx_posts_quoted_post_id ON public.posts(quoted_post_id) WHERE quoted_post_id IS NOT NULL;