-- Create table to cache AI post summaries
CREATE TABLE public.post_ai_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

-- Enable RLS
ALTER TABLE public.post_ai_summaries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read summaries (premium check is done in frontend)
CREATE POLICY "Anyone can read post summaries"
ON public.post_ai_summaries
FOR SELECT
USING (true);

-- Allow authenticated users to insert summaries
CREATE POLICY "Authenticated users can insert summaries"
ON public.post_ai_summaries
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for fast lookups
CREATE INDEX idx_post_ai_summaries_post_id ON public.post_ai_summaries(post_id);