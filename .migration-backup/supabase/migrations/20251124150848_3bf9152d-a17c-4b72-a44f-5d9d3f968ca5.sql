-- Create pinned_gifts table
CREATE TABLE public.pinned_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, gift_id)
);

-- Enable RLS
ALTER TABLE public.pinned_gifts ENABLE ROW LEVEL SECURITY;

-- Users can view pinned gifts
CREATE POLICY "Anyone can view pinned gifts"
  ON public.pinned_gifts
  FOR SELECT
  USING (true);

-- Users can pin their own gifts
CREATE POLICY "Users can pin their own gifts"
  ON public.pinned_gifts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unpin their own gifts
CREATE POLICY "Users can unpin their own gifts"
  ON public.pinned_gifts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_pinned_gifts_user_id ON public.pinned_gifts(user_id);
CREATE INDEX idx_pinned_gifts_gift_id ON public.pinned_gifts(gift_id);