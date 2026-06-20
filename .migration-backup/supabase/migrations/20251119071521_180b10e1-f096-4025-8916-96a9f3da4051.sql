-- Add column to track which business a user is affiliated with
ALTER TABLE public.profiles
ADD COLUMN affiliated_business_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX idx_profiles_affiliated_business ON public.profiles(affiliated_business_id);

-- Update RLS policies for affiliate_requests to allow business owners to view their requests
CREATE POLICY "Business owners can view their affiliate requests"
ON public.affiliate_requests
FOR SELECT
TO authenticated
USING (auth.uid() = business_profile_id);

-- Update RLS policies for affiliate_requests to allow business owners to update their requests
CREATE POLICY "Business owners can update their affiliate requests"
ON public.affiliate_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = business_profile_id)
WITH CHECK (auth.uid() = business_profile_id);

-- Create a function to approve affiliate requests (sets is_affiliate and affiliated_business_id)
CREATE OR REPLACE FUNCTION public.approve_affiliate_by_business(
  p_request_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request affiliate_requests;
  v_user_id uuid;
  v_business_id uuid;
BEGIN
  -- Get the request details
  SELECT * INTO v_request
  FROM affiliate_requests
  WHERE id = p_request_id
    AND status = 'pending'
    AND business_profile_id = auth.uid(); -- Only business owner can approve
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request not found or you do not have permission to approve it'
    );
  END IF;
  
  v_user_id := v_request.user_id;
  v_business_id := v_request.business_profile_id;
  
  -- Update the affiliate request status
  UPDATE affiliate_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id;
  
  -- Update the user's profile to mark them as affiliate and link to business
  UPDATE profiles
  SET is_affiliate = true,
      affiliated_business_id = v_business_id
  WHERE id = v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Affiliate request approved successfully'
  );
END;
$$;

-- Create a function to reject affiliate requests by business owner
CREATE OR REPLACE FUNCTION public.reject_affiliate_by_business(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request affiliate_requests;
BEGIN
  -- Get the request details
  SELECT * INTO v_request
  FROM affiliate_requests
  WHERE id = p_request_id
    AND status = 'pending'
    AND business_profile_id = auth.uid(); -- Only business owner can reject
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request not found or you do not have permission to reject it'
    );
  END IF;
  
  -- Update the affiliate request status
  UPDATE affiliate_requests
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Affiliate request rejected'
  );
END;
$$;