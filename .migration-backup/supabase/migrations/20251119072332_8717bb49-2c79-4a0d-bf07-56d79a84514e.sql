-- Drop and recreate the approve_affiliate_request function with correct logic
DROP FUNCTION IF EXISTS public.approve_affiliate_request(uuid);

CREATE OR REPLACE FUNCTION public.approve_affiliate_request(
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
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can approve affiliate requests'
    );
  END IF;

  -- Get the request details
  SELECT * INTO v_request
  FROM affiliate_requests
  WHERE id = p_request_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request not found or already processed'
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

-- Drop and recreate the reject_affiliate_request function with correct logic
DROP FUNCTION IF EXISTS public.reject_affiliate_request(uuid, text);

CREATE OR REPLACE FUNCTION public.reject_affiliate_request(
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
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can reject affiliate requests'
    );
  END IF;

  -- Get the request details
  SELECT * INTO v_request
  FROM affiliate_requests
  WHERE id = p_request_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request not found or already processed'
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