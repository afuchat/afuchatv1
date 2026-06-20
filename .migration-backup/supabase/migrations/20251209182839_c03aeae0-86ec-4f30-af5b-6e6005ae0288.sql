-- Create table for linked accounts (multi-account feature)
CREATE TABLE public.linked_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(primary_user_id, linked_user_id)
);

-- Enable RLS
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own linked accounts
CREATE POLICY "Users can view own linked accounts" 
ON public.linked_accounts 
FOR SELECT 
USING (auth.uid() = primary_user_id OR auth.uid() = linked_user_id);

-- Users can insert their own linked accounts (premium check will be in app logic)
CREATE POLICY "Users can insert own linked accounts" 
ON public.linked_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = primary_user_id);

-- Users can delete their own linked accounts
CREATE POLICY "Users can delete own linked accounts" 
ON public.linked_accounts 
FOR DELETE 
USING (auth.uid() = primary_user_id OR auth.uid() = linked_user_id);

-- Create index for faster lookups
CREATE INDEX idx_linked_accounts_primary ON public.linked_accounts(primary_user_id);
CREATE INDEX idx_linked_accounts_linked ON public.linked_accounts(linked_user_id);