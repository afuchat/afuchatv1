-- Drop problematic policies causing recursion
DROP POLICY IF EXISTS "Members can view their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view members of groups or their chats" ON public.chat_members;

-- Create a SECURITY DEFINER function to check chat membership without recursion
CREATE OR REPLACE FUNCTION public.get_user_chat_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT chat_id FROM chat_members WHERE user_id = p_user_id;
$$;

-- Simple policy for chats - no circular references
CREATE POLICY "Members can view their chats" ON public.chats
FOR SELECT
USING (
  is_group = true 
  OR is_channel = true
  OR created_by = auth.uid()
  OR user_id = auth.uid()
  OR id IN (SELECT get_user_chat_ids(auth.uid()))
);

-- Simple policy for chat_members - direct check only
CREATE POLICY "Users can view chat members" ON public.chat_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR chat_id IN (SELECT get_user_chat_ids(auth.uid()))
);