-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their member chats" ON public.chats;

-- Create a simpler, more direct policy for viewing chats
-- This avoids circular dependency by directly joining chat_members
CREATE POLICY "Members can view their chats" ON public.chats
FOR SELECT
USING (
  is_group = true 
  OR is_channel = true
  OR created_by = auth.uid()
  OR user_id = auth.uid()
  OR id IN (
    SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()
  )
);