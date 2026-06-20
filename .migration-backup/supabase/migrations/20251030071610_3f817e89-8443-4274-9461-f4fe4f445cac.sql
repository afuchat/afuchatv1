-- Add like functionality by creating a posts_likes table
-- Using post_acknowledgments table that already exists, but let's check if we need likes table
-- Actually, post_acknowledgments seems to be the likes table already
-- Let's just ensure RLS is set correctly for public viewing

-- Update posts RLS to allow public viewing without auth
DROP POLICY IF EXISTS "Anyone can view public posts" ON posts;

CREATE POLICY "Anyone can view public posts"
ON posts
FOR SELECT
USING (
  -- Allow anyone (even unauthenticated) to view posts from public profiles
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = posts.author_id 
    AND profiles.is_private = false
  )
  -- OR if user is authenticated and follows the author
  OR (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM follows 
      WHERE follows.following_id = posts.author_id 
      AND follows.follower_id = auth.uid()
    )
  )
  -- OR if user is viewing their own posts
  OR (auth.uid() = posts.author_id)
);

-- Update post_acknowledgments (likes) RLS to allow public viewing
DROP POLICY IF EXISTS "Users can view acknowledgments" ON post_acknowledgments;

CREATE POLICY "Anyone can view acknowledgments"
ON post_acknowledgments
FOR SELECT
USING (true);

-- Keep other policies for post_acknowledgments as they are
-- Users can still only create/delete their own acknowledgments

-- Update post_replies RLS to allow public viewing
DROP POLICY IF EXISTS "Anyone can view replies on public posts" ON post_replies;

CREATE POLICY "Anyone can view replies on public posts"
ON post_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts
    JOIN profiles ON profiles.id = posts.author_id
    WHERE posts.id = post_replies.post_id
    AND profiles.is_private = false
  )
  OR (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM posts
      JOIN follows ON follows.following_id = posts.author_id
      WHERE posts.id = post_replies.post_id
      AND follows.follower_id = auth.uid()
    )
  )
);

-- Update profiles RLS to truly allow public viewing of public profiles
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;

CREATE POLICY "Public profiles viewable by everyone"
ON profiles
FOR SELECT
USING (
  is_private = false 
  OR id = auth.uid()
  OR (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM follows 
      WHERE follows.following_id = profiles.id 
      AND follows.follower_id = auth.uid()
    )
  )
);