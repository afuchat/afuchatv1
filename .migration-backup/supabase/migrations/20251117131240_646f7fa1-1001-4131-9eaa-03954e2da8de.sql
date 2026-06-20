-- Add parent_reply_id column to post_replies for nested comments
ALTER TABLE post_replies 
ADD COLUMN parent_reply_id uuid REFERENCES post_replies(id) ON DELETE CASCADE;

-- Add index for better query performance on nested replies
CREATE INDEX idx_post_replies_parent_id ON post_replies(parent_reply_id);

-- Update RLS policies for nested replies to allow viewing nested structure
-- The existing SELECT policies should already cover this, but let's make sure

-- Add a comment for clarity
COMMENT ON COLUMN post_replies.parent_reply_id IS 'References another reply if this is a nested reply (reply to a reply)';