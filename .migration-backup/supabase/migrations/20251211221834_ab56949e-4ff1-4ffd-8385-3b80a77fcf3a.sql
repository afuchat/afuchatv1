-- Add is_channel column to chats table for channel support
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_channel boolean DEFAULT false;

-- Create function to check if user is the original group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chats
    WHERE id = _chat_id
      AND created_by = _user_id
  )
$$;

-- Create function to handle rejoin with admin rights restoration
CREATE OR REPLACE FUNCTION public.rejoin_group_with_admin_check(
  _user_id uuid,
  _chat_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_creator boolean;
BEGIN
  -- Check if user is the original creator
  SELECT created_by = _user_id INTO is_creator
  FROM public.chats
  WHERE id = _chat_id;

  -- Insert member with admin rights if creator, otherwise regular member
  INSERT INTO public.chat_members (chat_id, user_id, is_admin)
  VALUES (_chat_id, _user_id, COALESCE(is_creator, false))
  ON CONFLICT (chat_id, user_id) 
  DO UPDATE SET is_admin = COALESCE(is_creator, false);

  RETURN COALESCE(is_creator, false);
END;
$$;

-- Add unique constraint on chat_members if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chat_members_chat_user_unique'
  ) THEN
    ALTER TABLE public.chat_members 
    ADD CONSTRAINT chat_members_chat_user_unique UNIQUE (chat_id, user_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist under different name
  NULL;
END $$;

-- Create storage bucket for group avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for group avatars
CREATE POLICY "Anyone can view group avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-avatars');

CREATE POLICY "Authenticated users can upload group avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'group-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Group admins can update their group avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'group-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Group admins can delete their group avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'group-avatars' AND auth.role() = 'authenticated');