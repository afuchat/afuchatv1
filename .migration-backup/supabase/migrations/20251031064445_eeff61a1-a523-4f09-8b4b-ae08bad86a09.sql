-- Comprehensive fix for all chat-related RLS recursion issues

-- First, ensure we have our helper function (already created but ensuring it exists)
-- This function can safely check membership without triggering RLS
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

-- Create another helper for checking admin status
CREATE OR REPLACE FUNCTION public.is_chat_admin(_user_id uuid, _chat_id uuid)
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
      AND is_admin = true
  )
$$;

-- Fix ALL chats table policies
DROP POLICY IF EXISTS "Users can view chats they are members of" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Admins can update group chats" ON public.chats;

-- Recreate chats policies using security definer functions
CREATE POLICY "Users can view chats they are members of"
ON public.chats
FOR SELECT
USING (public.is_chat_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create chats"
ON public.chats
FOR INSERT
WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update group chats"
ON public.chats
FOR UPDATE
USING (public.is_chat_admin(auth.uid(), id));

-- Fix ALL chat_members policies (recreate to ensure consistency)
DROP POLICY IF EXISTS "Users can view members of their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON public.chat_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.chat_members;

-- Recreate chat_members policies using security definer functions
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
USING (public.is_chat_admin(auth.uid(), chat_id));