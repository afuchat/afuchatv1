-- Add UPDATE policy to allow users to update their own gift transactions
CREATE POLICY "Users can update their own gift transactions"
ON public.gift_transactions
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);