-- Allow chat creators to add members to their non-group chats
CREATE POLICY "Chat creators can add members to their chats"
ON public.chat_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_members.chat_id
    AND chats.created_by = auth.uid()
    AND chats.is_group = false
  )
);