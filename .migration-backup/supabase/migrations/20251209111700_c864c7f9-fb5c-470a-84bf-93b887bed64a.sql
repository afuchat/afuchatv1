-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can cancel their pending requests" ON public.follow_requests;

-- Create a new delete policy that allows users to delete their own pending OR rejected requests
CREATE POLICY "Users can delete their own requests" 
ON public.follow_requests 
FOR DELETE 
USING (auth.uid() = requester_id AND status IN ('pending', 'rejected'));