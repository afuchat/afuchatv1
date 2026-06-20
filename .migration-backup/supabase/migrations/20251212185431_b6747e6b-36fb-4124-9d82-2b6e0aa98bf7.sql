-- Add view_count column to messages table for channel message views
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create message_views table to track unique views
CREATE TABLE IF NOT EXISTS public.message_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

-- Anyone can view message_views (for count display)
CREATE POLICY "Anyone can view message views" 
ON public.message_views 
FOR SELECT 
USING (true);

-- Authenticated users can insert their own views
CREATE POLICY "Users can insert their own views" 
ON public.message_views 
FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

-- Function to increment message view count
CREATE OR REPLACE FUNCTION public.increment_message_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET view_count = view_count + 1
  WHERE id = NEW.message_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-increment view count on new view
DROP TRIGGER IF EXISTS on_message_view_insert ON public.message_views;
CREATE TRIGGER on_message_view_insert
  AFTER INSERT ON public.message_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_message_view_count();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_views_message_id ON public.message_views(message_id);