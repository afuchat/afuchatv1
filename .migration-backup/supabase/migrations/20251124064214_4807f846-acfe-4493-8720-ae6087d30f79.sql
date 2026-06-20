-- Create post_views table to track post views
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, viewer_id)
);

-- Create index for faster queries
CREATE INDEX idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX idx_post_views_viewer_id ON public.post_views(viewer_id);

-- Enable RLS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view post views"
  ON public.post_views
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own views"
  ON public.post_views
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Add view_count column to posts for efficient counting
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-increment view count
DROP TRIGGER IF EXISTS trigger_increment_post_view_count ON public.post_views;
CREATE TRIGGER trigger_increment_post_view_count
  AFTER INSERT ON public.post_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_post_view_count();