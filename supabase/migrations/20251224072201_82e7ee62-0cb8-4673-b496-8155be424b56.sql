-- Create profile_views table to track who viewed profiles
CREATE TABLE public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_profile_view UNIQUE (profile_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Profile owners can see who viewed their profile
CREATE POLICY "Profile owners can view their viewers"
ON public.profile_views
FOR SELECT
USING (auth.uid() = profile_id);

-- Users can record their profile views
CREATE POLICY "Users can record profile views"
ON public.profile_views
FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- Update existing view timestamp when user views again
CREATE POLICY "Users can update their own views"
ON public.profile_views
FOR UPDATE
USING (auth.uid() = viewer_id);

-- Users can delete their own view records
CREATE POLICY "Users can delete their own views"
ON public.profile_views
FOR DELETE
USING (auth.uid() = viewer_id);

-- Create index for faster lookups
CREATE INDEX idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_viewer_id ON public.profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed_at ON public.profile_views(viewed_at DESC);