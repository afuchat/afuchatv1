-- Make posts publicly viewable
DROP POLICY IF EXISTS "Users can view public posts or posts from followed users" ON public.posts;
CREATE POLICY "Anyone can view public posts"
ON public.posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = posts.author_id
    AND profiles.is_private = false
  )
  OR 
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM follows
    WHERE follows.following_id = posts.author_id
    AND follows.follower_id = auth.uid()
  ))
  OR posts.author_id = auth.uid()
);

-- Make profiles publicly viewable but respect privacy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles viewable by all"
ON public.profiles
FOR SELECT
USING (
  is_private = false
  OR id = auth.uid()
  OR (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM follows
    WHERE following_id = profiles.id
    AND follower_id = auth.uid()
  ))
);

-- Allow public to view post replies for public posts
DROP POLICY IF EXISTS "Users can view replies on visible posts" ON public.post_replies;
CREATE POLICY "Anyone can view replies on public posts"
ON public.post_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_replies.post_id
  )
);

-- Chats require mutual follows or direct creation
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Authenticated users can create chats"
ON public.chats
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND auth.uid() IS NOT NULL
);