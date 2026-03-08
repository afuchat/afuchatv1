-- Add unique constraint on story_views to prevent duplicate views per user per story
ALTER TABLE public.story_views 
ADD CONSTRAINT story_views_story_id_viewer_id_unique 
UNIQUE (story_id, viewer_id);