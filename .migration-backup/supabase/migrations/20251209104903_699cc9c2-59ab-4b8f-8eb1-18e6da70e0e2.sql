-- Create follow_requests table for private account follow approvals
CREATE TABLE public.follow_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (requester_id, target_id)
);

-- Enable RLS
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests (sent or received)
CREATE POLICY "Users can view their own follow requests"
ON public.follow_requests
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Users can create follow requests
CREATE POLICY "Users can create follow requests"
ON public.follow_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Target users can update (approve/reject) requests
CREATE POLICY "Target users can respond to follow requests"
ON public.follow_requests
FOR UPDATE
USING (auth.uid() = target_id);

-- Requesters can delete their pending requests (cancel)
CREATE POLICY "Users can cancel their pending requests"
ON public.follow_requests
FOR DELETE
USING (auth.uid() = requester_id AND status = 'pending');