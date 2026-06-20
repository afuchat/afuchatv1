-- Fix: Chats RLS policy exposes all group chats publicly
-- Drop the problematic policy that allows viewing all group chats
DROP POLICY IF EXISTS "Users can view group chats or their member chats" ON public.chats;

-- Create a more secure policy: users can only view chats they are members of
-- Group chats should still be discoverable for joining, but with limited info
CREATE POLICY "Users can view their member chats"
ON public.chats
FOR SELECT
USING (
  -- User is a member of the chat
  public.is_chat_member(auth.uid(), id)
  -- OR user created the chat
  OR created_by = auth.uid()
  -- OR user_id matches (for 1-on-1 chats)
  OR user_id = auth.uid()
);

-- Create a separate policy for group discovery (limited fields via RPC is better, but this allows basic visibility)
-- This policy allows seeing that a group exists if it's public, but the main data is protected
-- For now, we restrict group visibility to members only for security
-- If group discovery is needed, it should be done via a secure RPC function

-- Also ensure the "View messages in groups or member chats" policy is secure
-- Let's check and update the messages policy as well
DROP POLICY IF EXISTS "View messages in groups or member chats" ON public.messages;

-- Messages should only be viewable by chat members
CREATE POLICY "View messages in member chats"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = messages.chat_id
      AND (chats.user_id = auth.uid() OR chats.created_by = auth.uid())
  )
);