-- Create table for link previews
CREATE TABLE IF NOT EXISTS public.post_link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, url)
);

-- Enable RLS
ALTER TABLE public.post_link_previews ENABLE ROW LEVEL SECURITY;

-- Create policies for link previews
CREATE POLICY "Link previews are viewable by everyone"
  ON public.post_link_previews FOR SELECT
  USING (true);

CREATE POLICY "Users can create link previews for their own posts"
  ON public.post_link_previews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_post_link_previews_post_id ON public.post_link_previews(post_id);
CREATE INDEX idx_post_link_previews_url ON public.post_link_previews(url);