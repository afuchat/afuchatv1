-- Fix chat_members policies to avoid recursive reference
DROP POLICY IF EXISTS "Users can view members of their chats" ON chat_members;
DROP POLICY IF EXISTS "Users can add themselves to chats" ON chat_members;
DROP POLICY IF EXISTS "Users can remove themselves from chats" ON chat_members;

-- View: allow users to see members of chats they belong to, using helper function to avoid recursion
CREATE POLICY "Users can view members of their chats"
ON chat_members
FOR SELECT
USING (
  chat_id IS NOT NULL
  AND is_user_in_chat(chat_id, auth.uid())
);

-- Insert: users can only add themselves
CREATE POLICY "Users can add themselves to chats"
ON chat_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Delete: users can only remove themselves from chats
CREATE POLICY "Users can remove themselves from chats"
ON chat_members
FOR DELETE
USING (user_id = auth.uid());