-- Drop existing function first
DROP FUNCTION IF EXISTS public.request_creator_withdrawal(text, text);

-- Recreate withdrawal request function with 10% fee
CREATE OR REPLACE FUNCTION public.request_creator_withdrawal(
  p_phone_number text,
  p_mobile_network text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_balance integer;
  v_is_eligible boolean;
  v_day_of_week integer;
  v_fee integer;
  v_net_amount integer;
  v_withdrawal_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if it's weekend (0 = Sunday, 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM NOW());
  IF v_day_of_week NOT IN (0, 6) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawals are only available on weekends');
  END IF;
  
  -- Get user balance
  SELECT available_balance_ugx INTO v_balance
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_balance IS NULL OR v_balance < 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal is 5,000 UGX');
  END IF;
  
  -- Check eligibility
  SELECT is_eligible INTO v_is_eligible
  FROM check_creator_eligibility(v_user_id);
  
  IF NOT v_is_eligible THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not eligible for withdrawals');
  END IF;
  
  -- Check for pending withdrawal
  IF EXISTS (
    SELECT 1 FROM creator_withdrawals 
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending withdrawal request');
  END IF;
  
  -- Calculate 10% fee
  v_fee := CEIL(v_balance * 0.10);
  v_net_amount := v_balance - v_fee;
  
  -- Create withdrawal request (pending admin approval)
  INSERT INTO creator_withdrawals (
    user_id,
    amount_ugx,
    phone_number,
    mobile_network,
    status,
    notes
  ) VALUES (
    v_user_id,
    v_net_amount,
    p_phone_number,
    p_mobile_network,
    'pending',
    'Fee: ' || v_fee || ' UGX (10%)'
  )
  RETURNING id INTO v_withdrawal_id;
  
  -- Deduct full balance (including fee)
  UPDATE profiles
  SET available_balance_ugx = 0
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'withdrawal_id', v_withdrawal_id,
    'gross_amount', v_balance,
    'fee', v_fee,
    'net_amount', v_net_amount,
    'message', 'Withdrawal request submitted for admin approval'
  );
END;
$$;

-- Create admin function to approve/reject withdrawals
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_withdrawal_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_withdrawal record;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Get withdrawal
  SELECT * INTO v_withdrawal
  FROM creator_withdrawals
  WHERE id = p_withdrawal_id AND status = 'pending';
  
  IF v_withdrawal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found or already processed');
  END IF;
  
  IF p_action = 'approve' THEN
    UPDATE creator_withdrawals
    SET status = 'approved',
        processed_at = NOW(),
        notes = COALESCE(p_notes, notes)
    WHERE id = p_withdrawal_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Withdrawal approved');
    
  ELSIF p_action = 'reject' THEN
    -- Refund the amount to user (without fee as penalty)
    UPDATE profiles
    SET available_balance_ugx = available_balance_ugx + v_withdrawal.amount_ugx
    WHERE id = v_withdrawal.user_id;
    
    UPDATE creator_withdrawals
    SET status = 'rejected',
        processed_at = NOW(),
        notes = COALESCE(p_notes, 'Rejected by admin')
    WHERE id = p_withdrawal_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Withdrawal rejected, amount refunded');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Use approve or reject');
  END IF;
END;
$$;

-- Create function to get pending withdrawals for admin
CREATE OR REPLACE FUNCTION public.get_pending_withdrawals()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  handle text,
  avatar_url text,
  amount_ugx integer,
  phone_number text,
  mobile_network text,
  requested_at timestamptz,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND is_admin = true
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    cw.id,
    cw.user_id,
    p.display_name,
    p.handle,
    p.avatar_url,
    cw.amount_ugx,
    cw.phone_number,
    cw.mobile_network,
    cw.requested_at,
    cw.notes
  FROM creator_withdrawals cw
  JOIN profiles p ON p.id = cw.user_id
  WHERE cw.status = 'pending'
  ORDER BY cw.requested_at ASC;
END;
$$;