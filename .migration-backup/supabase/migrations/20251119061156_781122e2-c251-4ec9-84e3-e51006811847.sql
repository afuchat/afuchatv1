-- Create business_accounts table to store business profiles
CREATE TABLE IF NOT EXISTS public.business_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  description text,
  website_url text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;

-- Business accounts are viewable by everyone
CREATE POLICY "Anyone can view business accounts"
ON public.business_accounts
FOR SELECT
USING (true);

-- Only verified business owners can create business accounts
CREATE POLICY "Verified users can create business accounts"
ON public.business_accounts
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Business owners can update their own accounts
CREATE POLICY "Business owners can update their accounts"
ON public.business_accounts
FOR UPDATE
USING (auth.uid() = owner_id);

-- Create affiliate_requests table for approval workflow
CREATE TABLE IF NOT EXISTS public.affiliate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  UNIQUE(user_id, business_id)
);

-- Enable RLS
ALTER TABLE public.affiliate_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own affiliate requests"
ON public.affiliate_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create affiliate requests
CREATE POLICY "Users can create affiliate requests"
ON public.affiliate_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all requests
CREATE POLICY "Admins can view all affiliate requests"
ON public.affiliate_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update affiliate requests"
ON public.affiliate_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to approve affiliate request
CREATE OR REPLACE FUNCTION public.approve_affiliate_request(
  p_request_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
  v_business_name text;
  v_business_logo text;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can approve affiliate requests'
    );
  END IF;

  -- Get request details
  SELECT user_id, business_id INTO v_user_id, v_business_id
  FROM affiliate_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request not found or already processed'
    );
  END IF;

  -- Get business details
  SELECT name, logo_url INTO v_business_name, v_business_logo
  FROM business_accounts
  WHERE id = v_business_id;

  -- Update the user's profile to set affiliate status
  UPDATE profiles
  SET 
    is_affiliate = true,
    affiliate_business_name = v_business_name,
    affiliate_business_logo = v_business_logo
  WHERE id = v_user_id;

  -- Update the request status
  UPDATE affiliate_requests
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = p_request_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Affiliate request approved successfully'
  );
END;
$$;

-- Create function to reject affiliate request
CREATE OR REPLACE FUNCTION public.reject_affiliate_request(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only admins can reject affiliate requests'
    );
  END IF;

  -- Update the request status
  UPDATE affiliate_requests
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    notes = p_notes
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request not found or already processed'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Affiliate request rejected'
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_affiliate_requests_status ON public.affiliate_requests(status);
CREATE INDEX idx_affiliate_requests_user_id ON public.affiliate_requests(user_id);
CREATE INDEX idx_business_accounts_owner ON public.business_accounts(owner_id);