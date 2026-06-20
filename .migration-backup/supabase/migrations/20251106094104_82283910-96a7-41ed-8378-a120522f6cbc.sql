-- Update RLS policy for gift_transactions to allow public viewing
DROP POLICY IF EXISTS "Users can view their sent gifts" ON gift_transactions;

CREATE POLICY "Anyone can view gift transactions"
ON gift_transactions
FOR SELECT
USING (true);