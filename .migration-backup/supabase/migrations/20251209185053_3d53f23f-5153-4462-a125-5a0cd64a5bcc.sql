-- Add unique constraint for linked_accounts to enable upsert
ALTER TABLE public.linked_accounts 
ADD CONSTRAINT linked_accounts_primary_linked_unique 
UNIQUE (primary_user_id, linked_user_id);