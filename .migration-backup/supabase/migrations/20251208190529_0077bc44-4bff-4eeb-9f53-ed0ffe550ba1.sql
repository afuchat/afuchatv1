-- Fix: Remove overly permissive UPDATE policy on red_envelopes
-- The current policy allows ANY authenticated user to update ANY red envelope record

-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "System can update red envelopes" ON public.red_envelopes;

-- Create a restrictive policy - only the sender can update their own envelopes (e.g., to cancel)
CREATE POLICY "Senders can update their own red envelopes"
ON public.red_envelopes
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- The claim_red_envelope RPC function already exists and uses SECURITY DEFINER
-- It properly handles incrementing claimed_count and marking as expired
-- All updates to red_envelopes should go through that RPC function