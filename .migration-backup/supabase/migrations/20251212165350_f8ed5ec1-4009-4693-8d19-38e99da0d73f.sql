-- Create function to delete a chat for both users (1-on-1 chats only)
CREATE OR REPLACE FUNCTION delete_chat_for_both(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member BOOLEAN;
  v_is_group BOOLEAN;
BEGIN
  -- Check if calling user is a member of this chat
  SELECT EXISTS (
    SELECT 1 FROM chat_members 
    WHERE chat_id = p_chat_id AND user_id = auth.uid()
  ) INTO v_is_member;
  
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this chat';
  END IF;
  
  -- Check if this is a group chat (only allow deleting 1-on-1 chats)
  SELECT is_group INTO v_is_group FROM chats WHERE id = p_chat_id;
  
  IF v_is_group THEN
    RAISE EXCEPTION 'Cannot delete group chats, only 1-on-1 chats';
  END IF;
  
  -- Delete all messages in the chat
  DELETE FROM messages WHERE chat_id = p_chat_id;
  
  -- Delete all message statuses for messages in this chat (handled by cascade)
  
  -- Delete all chat members
  DELETE FROM chat_members WHERE chat_id = p_chat_id;
  
  -- Delete all folder assignments
  DELETE FROM chat_folder_assignments WHERE chat_id = p_chat_id;
  
  -- Delete all label assignments
  DELETE FROM chat_label_assignments WHERE chat_id = p_chat_id;
  
  -- Finally delete the chat itself
  DELETE FROM chats WHERE id = p_chat_id;
  
  RETURN TRUE;
END;
$$;