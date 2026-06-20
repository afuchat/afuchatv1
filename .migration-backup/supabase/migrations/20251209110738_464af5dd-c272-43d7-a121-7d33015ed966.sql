-- Allow target users to create follows when approving follow requests
CREATE POLICY "Target can approve follow request"
ON public.follows
FOR INSERT
WITH CHECK (
  auth.uid() = following_id AND
  EXISTS (
    SELECT 1 FROM public.follow_requests
    WHERE follow_requests.requester_id = follows.follower_id
    AND follow_requests.target_id = auth.uid()
    AND follow_requests.status = 'approved'
  )
);