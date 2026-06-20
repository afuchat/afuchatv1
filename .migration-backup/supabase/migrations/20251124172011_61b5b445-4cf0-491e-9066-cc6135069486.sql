-- Fix subscription purchase to replace instead of stack

-- Drop the old function
DROP FUNCTION IF EXISTS purchase_subscription(UUID);

-- Recreate with fix: deactivate old subscriptions before creating new one
CREATE OR REPLACE FUNCTION purchase_subscription(p_plan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_acoin INTEGER;
  v_plan_price INTEGER;
  v_plan_duration INTEGER;
  v_grants_verification BOOLEAN;
  v_new_acoin INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get plan details
  SELECT acoin_price, duration_days, grants_verification
  INTO v_plan_price, v_plan_duration, v_grants_verification
  FROM subscription_plans
  WHERE id = p_plan_id AND is_active = true;

  IF v_plan_price IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid subscription plan'
    );
  END IF;

  -- Get user's ACoin balance
  SELECT acoin INTO v_user_acoin
  FROM profiles
  WHERE id = v_user_id;

  -- Check if user has enough ACoin
  IF v_user_acoin < v_plan_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient ACoin balance',
      'required', v_plan_price,
      'current', v_user_acoin
    );
  END IF;

  -- Deactivate all previous subscriptions for this user
  UPDATE user_subscriptions
  SET is_active = false
  WHERE user_id = v_user_id AND is_active = true;

  -- Calculate expiration date from now (not extending previous subscription)
  v_expires_at := now() + (v_plan_duration || ' days')::INTERVAL;

  -- Deduct ACoin
  UPDATE profiles
  SET acoin = acoin - v_plan_price
  WHERE id = v_user_id
  RETURNING acoin INTO v_new_acoin;

  -- Create new subscription record
  INSERT INTO user_subscriptions (user_id, plan_id, expires_at, acoin_paid)
  VALUES (v_user_id, p_plan_id, v_expires_at, v_plan_price);

  -- Grant verification if plan includes it
  IF v_grants_verification THEN
    UPDATE profiles
    SET is_verified = true
    WHERE id = v_user_id;
  END IF;

  -- Log transaction
  INSERT INTO acoin_transactions (user_id, amount, transaction_type, metadata)
  VALUES (v_user_id, -v_plan_price, 'subscription', 
    jsonb_build_object('plan_id', p_plan_id, 'expires_at', v_expires_at));

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription purchased successfully!',
    'expires_at', v_expires_at,
    'new_acoin_balance', v_new_acoin,
    'verified', v_grants_verification
  );
END;
$$;