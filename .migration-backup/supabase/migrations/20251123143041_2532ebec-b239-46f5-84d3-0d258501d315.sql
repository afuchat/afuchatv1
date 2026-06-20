-- Drop the restrictive chat_members policy
DROP POLICY IF EXISTS "Self access to chat_members" ON chat_members;

-- Create a new policy that allows users to see all members of chats they belong to
CREATE POLICY "Users can view members of their chats"
ON chat_members
FOR SELECT
USING (
  chat_id IN (
    SELECT chat_id 
    FROM chat_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to insert themselves into chats
CREATE POLICY "Users can add themselves to chats"
ON chat_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to remove themselves from chats
CREATE POLICY "Users can remove themselves from chats"
ON chat_members
FOR DELETE
USING (user_id = auth.uid());