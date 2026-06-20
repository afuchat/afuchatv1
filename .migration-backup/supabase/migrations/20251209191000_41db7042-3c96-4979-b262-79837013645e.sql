-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own linked accounts" ON public.linked_accounts;

-- Create new policy that allows inserting when user is either primary or linked
CREATE POLICY "Users can insert linked accounts" 
ON public.linked_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = primary_user_id OR auth.uid() = linked_user_id);