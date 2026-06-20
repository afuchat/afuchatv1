-- Add pinning functionality to post_replies
ALTER TABLE post_replies 
ADD COLUMN is_pinned BOOLEAN DEFAULT false,
ADD COLUMN pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster pinned comment queries
CREATE INDEX idx_post_replies_pinned ON post_replies(post_id, is_pinned) WHERE is_pinned = true;

-- Add RLS policy to allow post authors to pin/unpin comments on their posts
CREATE POLICY "Post authors can update pin status on their posts"
ON post_replies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_replies.post_id 
    AND posts.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_replies.post_id 
    AND posts.author_id = auth.uid()
  )
);

-- Add RLS policy to allow users to delete their own replies
CREATE POLICY "Users can delete their own replies"
ON post_replies
FOR DELETE
USING (auth.uid() = author_id);

-- Add RLS policy to allow post authors to delete any replies on their posts
CREATE POLICY "Post authors can delete replies on their posts"
ON post_replies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_replies.post_id 
    AND posts.author_id = auth.uid()
  )
);