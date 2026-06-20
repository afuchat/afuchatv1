-- Update the request_creator_withdrawal function to remove all limits for admin users
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
  v_is_admin boolean;
  v_day_of_week integer;
  v_fee integer;
  v_net_amount integer;
  v_withdrawal_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  v_is_admin := COALESCE(v_is_admin, false);
  
  -- Check if it's weekend (0 = Sunday, 6 = Saturday) - SKIP for admins
  IF NOT v_is_admin THEN
    v_day_of_week := EXTRACT(DOW FROM NOW());
    IF v_day_of_week NOT IN (0, 6) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Withdrawals are only available on weekends');
    END IF;
  END IF;
  
  -- Get user balance
  SELECT available_balance_ugx INTO v_balance
  FROM profiles
  WHERE id = v_user_id;
  
  -- Check minimum balance - SKIP for admins (no minimum)
  IF NOT v_is_admin THEN
    IF v_balance IS NULL OR v_balance < 5000 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal is 5,000 UGX');
    END IF;
  ELSE
    -- Admins can withdraw any amount > 0
    IF v_balance IS NULL OR v_balance <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'No balance to withdraw');
    END IF;
  END IF;
  
  -- Check eligibility - SKIP for admins
  IF NOT v_is_admin THEN
    SELECT is_eligible INTO v_is_eligible
    FROM check_creator_eligibility(v_user_id);
    
    IF NOT v_is_eligible THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are not eligible for withdrawals');
    END IF;
  END IF;
  
  -- Check for pending withdrawal
  IF EXISTS (
    SELECT 1 FROM creator_withdrawals 
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending withdrawal request');
  END IF;
  
  -- Calculate 10% fee (no fee for admins)
  IF v_is_admin THEN
    v_fee := 0;
    v_net_amount := v_balance;
  ELSE
    v_fee := CEIL(v_balance * 0.10);
    v_net_amount := v_balance - v_fee;
  END IF;
  
  -- Create withdrawal request (pending admin approval for non-admins, auto-approved for admins)
  INSERT INTO creator_withdrawals (
    user_id,
    amount_ugx,
    phone_number,
    mobile_network,
    status,
    notes,
    processed_at
  ) VALUES (
    v_user_id,
    v_net_amount,
    p_phone_number,
    p_mobile_network,
    CASE WHEN v_is_admin THEN 'approved' ELSE 'pending' END,
    CASE WHEN v_is_admin THEN 'Admin withdrawal (no fee)' ELSE 'Fee: ' || v_fee || ' UGX (10%)' END,
    CASE WHEN v_is_admin THEN NOW() ELSE NULL END
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
    'is_admin', v_is_admin,
    'message', CASE WHEN v_is_admin THEN 'Withdrawal auto-approved' ELSE 'Withdrawal request submitted for admin approval' END
  );
END;
$$;

-- Update credit_daily_creator_earnings to ensure it properly credits eligible users at 8pm
CREATE OR REPLACE FUNCTION public.credit_daily_creator_earnings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credited_count integer := 0;
  v_missed_count integer := 0;
  v_total_distributed integer := 0;
  v_participant record;
  v_is_eligible boolean;
  v_eligibility_check record;
BEGIN
  -- Get all participants from today's leaderboard
  FOR v_participant IN 
    SELECT * FROM get_daily_engagement_leaderboard()
    WHERE potential_earnings > 0
  LOOP
    -- Check if user is eligible
    SELECT * INTO v_eligibility_check
    FROM check_creator_eligibility(v_participant.user_id);
    
    v_is_eligible := v_eligibility_check.is_eligible;
    
    IF v_is_eligible THEN
      -- Credit earnings to user's balance
      UPDATE profiles
      SET available_balance_ugx = available_balance_ugx + v_participant.potential_earnings
      WHERE id = v_participant.user_id;
      
      -- Record in creator_earnings table
      INSERT INTO creator_earnings (
        user_id,
        amount_ugx,
        earned_date,
        engagement_score,
        views_count,
        likes_count
      ) VALUES (
        v_participant.user_id,
        v_participant.potential_earnings,
        CURRENT_DATE,
        v_participant.engagement_score,
        v_participant.views_count,
        v_participant.likes_count
      )
      ON CONFLICT (user_id, earned_date) 
      DO UPDATE SET
        amount_ugx = EXCLUDED.amount_ugx,
        engagement_score = EXCLUDED.engagement_score,
        views_count = EXCLUDED.views_count,
        likes_count = EXCLUDED.likes_count;
      
      v_credited_count := v_credited_count + 1;
      v_total_distributed := v_total_distributed + v_participant.potential_earnings;
    ELSE
      -- User not eligible - add to missed earnings
      UPDATE profiles
      SET missed_earnings_total = COALESCE(missed_earnings_total, 0) + v_participant.potential_earnings
      WHERE id = v_participant.user_id;
      
      v_missed_count := v_missed_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'credited_count', v_credited_count,
    'missed_count', v_missed_count,
    'total_distributed', v_total_distributed,
    'credited_at', NOW()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.request_creator_withdrawal(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_daily_creator_earnings() TO authenticated;