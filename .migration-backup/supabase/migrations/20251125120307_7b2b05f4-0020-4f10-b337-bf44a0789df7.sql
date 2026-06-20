-- Allow anyone to view group chats (for public joining)
DROP POLICY IF EXISTS "Users can view chats they are members of" ON chats;
CREATE POLICY "Users can view group chats or their member chats"
ON chats FOR SELECT
USING (
  is_group = true OR is_chat_member(auth.uid(), id)
);

-- Allow anyone to view messages in group chats
DROP POLICY IF EXISTS "View all in shared chats" ON messages;
CREATE POLICY "View messages in groups or member chats"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.is_group = true OR is_chat_member(auth.uid(), chats.id))
  )
);

-- Allow anyone to view chat members in groups
DROP POLICY IF EXISTS "Users can view members of their chats" ON chat_members;
CREATE POLICY "Users can view members of groups or their chats"
ON chat_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_members.chat_id
    AND (chats.is_group = true OR is_chat_member(auth.uid(), chats.id))
  )
);

-- Allow users to join groups
CREATE POLICY "Users can join groups"
ON chat_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_members.chat_id
    AND chats.is_group = true
  )
);