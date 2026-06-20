-- Create developer showcase/portfolio table
CREATE TABLE public.developer_showcase (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  github_url TEXT,
  technologies TEXT[],
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.developer_showcase ENABLE ROW LEVEL SECURITY;

-- Public can view all showcase items
CREATE POLICY "Anyone can view developer showcase"
ON public.developer_showcase
FOR SELECT
USING (true);

-- Only the owner can insert their own showcase items
CREATE POLICY "Developers can add their own showcase"
ON public.developer_showcase
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their own showcase items
CREATE POLICY "Developers can update their own showcase"
ON public.developer_showcase
FOR UPDATE
USING (auth.uid() = user_id);

-- Only the owner can delete their own showcase items
CREATE POLICY "Developers can delete their own showcase"
ON public.developer_showcase
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_developer_showcase_user_id ON public.developer_showcase(user_id);
CREATE INDEX idx_developer_showcase_created_at ON public.developer_showcase(created_at DESC);