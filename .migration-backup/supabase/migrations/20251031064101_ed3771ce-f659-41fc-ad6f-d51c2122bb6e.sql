-- Fix infinite recursion in chat_members RLS policies

-- Create security definer function to check if user is member of a chat
CREATE OR REPLACE FUNCTION public.is_chat_member(_user_id uuid, _chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members
    WHERE user_id = _user_id
      AND chat_id = _chat_id
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view members of their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON public.chat_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.chat_members;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view members of their chats"
ON public.chat_members
FOR SELECT
USING (public.is_chat_member(auth.uid(), chat_id));

CREATE POLICY "Users can join chats"
ON public.chat_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage members"
ON public.chat_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_members cm
    WHERE cm.chat_id = chat_members.chat_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = true
  )
);