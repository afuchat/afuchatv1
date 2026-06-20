-- Update approve_affiliate_by_business function to accept commission rate and payment terms
CREATE OR REPLACE FUNCTION public.approve_affiliate_by_business(
  p_request_id uuid,
  p_commission_rate decimal DEFAULT 10.00,
  p_payment_terms text DEFAULT 'Monthly payment based on affiliate performance'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Update the affiliate request status with commission rate and payment terms
  UPDATE affiliate_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      commission_rate = p_commission_rate,
      payment_terms = p_payment_terms
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