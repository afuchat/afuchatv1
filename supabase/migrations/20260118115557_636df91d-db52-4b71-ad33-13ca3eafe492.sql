-- Add wall_user_id column to posts table for wall posts
-- When wall_user_id is set, the post appears on that user's profile wall
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS wall_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for efficient wall post lookups
CREATE INDEX IF NOT EXISTS idx_posts_wall_user_id ON public.posts(wall_user_id) WHERE wall_user_id IS NOT NULL;

-- Update RLS policy to allow viewing wall posts
-- Users can see posts on their own wall or public posts
DROP POLICY IF EXISTS "Users can view posts on their wall" ON public.posts;
CREATE POLICY "Users can view posts on their wall" 
ON public.posts 
FOR SELECT 
USING (
  wall_user_id IS NULL 
  OR wall_user_id = auth.uid() 
  OR author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = auth.uid() 
    AND following_id = posts.wall_user_id
  )
);