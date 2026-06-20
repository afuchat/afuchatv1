-- Add commission and earnings tracking fields to affiliate_requests
ALTER TABLE affiliate_requests 
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT NULL;

-- Add earnings tracking to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS affiliate_earnings INTEGER DEFAULT 0;

-- Drop old admin-only functions
DROP FUNCTION IF EXISTS public.approve_affiliate_request(uuid);
DROP FUNCTION IF EXISTS public.reject_affiliate_request(uuid, text);

-- Update RLS policies to remove admin requirement and give business owners full control
DROP POLICY IF EXISTS "Admins can update affiliate requests" ON affiliate_requests;
DROP POLICY IF EXISTS "Admins can view all affiliate requests" ON affiliate_requests;
DROP POLICY IF EXISTS "Business owners manage affiliate requests" ON affiliate_requests;

-- Ensure business owners can manage their own affiliate requests
CREATE POLICY "Business owners manage affiliate requests"
  ON affiliate_requests
  FOR ALL
  USING (auth.uid() = business_profile_id)
  WITH CHECK (auth.uid() = business_profile_id);

-- Update the approve function to ensure only business owner can approve
CREATE OR REPLACE FUNCTION public.approve_affiliate_by_business(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request affiliate_requests;
  v_user_id uuid;
  v_business_id uuid;
  v_existing_affiliation uuid;
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
  
  -- Check if user is already affiliated with another business
  SELECT affiliated_business_id INTO v_existing_affiliation
  FROM profiles
  WHERE id = v_user_id AND is_affiliate = true;
  
  IF v_existing_affiliation IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User is already affiliated with another business'
    );
  END IF;
  
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

-- Update the reject function similarly
CREATE OR REPLACE FUNCTION public.reject_affiliate_by_business(p_request_id uuid, p_notes text DEFAULT NULL)
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