-- Update request_creator_withdrawal to make admin withdrawals normal except no limits
CREATE OR REPLACE FUNCTION public.request_creator_withdrawal(
  p_amount_ugx INTEGER,
  p_phone_number TEXT,
  p_mobile_network TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_available_balance INTEGER;
  v_is_admin BOOLEAN;
  v_day_of_week INTEGER;
  v_fee INTEGER;
  v_net_amount INTEGER;
BEGIN
  -- Get user's balance and admin status
  SELECT available_balance_ugx, COALESCE(is_admin, false)
  INTO v_available_balance, v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  -- Get current day (0 = Sunday, 6 = Saturday in Uganda time)
  v_day_of_week := EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Africa/Kampala'));
  
  -- For non-admins: Check if it's weekend (Saturday = 6 or Sunday = 0)
  IF NOT v_is_admin AND v_day_of_week NOT IN (0, 6) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Withdrawals are only available on weekends (Saturday and Sunday)'
    );
  END IF;
  
  -- For non-admins: Check minimum withdrawal
  IF NOT v_is_admin AND p_amount_ugx < 5000 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Minimum withdrawal amount is 5,000 UGX'
    );
  END IF;
  
  -- All users: Check amount is positive
  IF p_amount_ugx <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Withdrawal amount must be greater than 0'
    );
  END IF;
  
  -- Check sufficient balance
  IF v_available_balance < p_amount_ugx THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient balance. Available: ' || v_available_balance || ' UGX'
    );
  END IF;
  
  -- For non-admins: Check eligibility
  IF NOT v_is_admin THEN
    DECLARE
      v_eligibility jsonb;
    BEGIN
      v_eligibility := check_creator_eligibility(v_user_id);
      IF NOT (v_eligibility->>'eligible')::boolean THEN
        RETURN jsonb_build_object(
          'success', false,
          'message', v_eligibility->>'reason'
        );
      END IF;
    END;
  END IF;
  
  -- Calculate 10% fee for ALL users (including admins)
  v_fee := CEIL(p_amount_ugx * 0.10);
  v_net_amount := p_amount_ugx - v_fee;
  
  -- Deduct from balance
  UPDATE profiles
  SET available_balance_ugx = available_balance_ugx - p_amount_ugx
  WHERE id = v_user_id;
  
  -- Create withdrawal request (pending status for ALL users - requires approval)
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
    'Fee: ' || v_fee || ' UGX'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request submitted for approval',
    'gross_amount', p_amount_ugx,
    'fee', v_fee,
    'net_amount', v_net_amount,
    'new_balance', v_available_balance - p_amount_ugx
  );
END;
$$;