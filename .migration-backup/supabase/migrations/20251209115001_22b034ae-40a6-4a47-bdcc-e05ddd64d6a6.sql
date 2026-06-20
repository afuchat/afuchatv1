-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.follow_requests;

-- Create new delete policy that allows deleting approved requests if user is no longer following
CREATE POLICY "Users can delete their own requests"
ON public.follow_requests
FOR DELETE
USING (
  (auth.uid() = requester_id) 
  AND (
    -- Allow deleting pending or rejected requests
    (status IN ('pending', 'rejected'))
    OR
    -- Allow deleting approved requests if no longer following (unfollowed)
    (status = 'approved' AND NOT EXISTS (
      SELECT 1 FROM follows 
      WHERE follower_id = auth.uid() 
      AND following_id = follow_requests.target_id
    ))
  )
);