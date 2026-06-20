-- Update purchase_subscription function to set verification_source = 'premium'
CREATE OR REPLACE FUNCTION public.purchase_subscription(p_plan_id UUID)
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
  v_active_subscription RECORD;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Check for existing active subscription
  SELECT * INTO v_active_subscription
  FROM user_subscriptions
  WHERE user_id = v_user_id 
    AND is_active = true 
    AND expires_at > now()
  LIMIT 1;

  IF v_active_subscription IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already have an active subscription. Please wait until it expires or cancel it first.',
      'expires_at', v_active_subscription.expires_at
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

  -- Calculate expiration date from now
  v_expires_at := now() + (v_plan_duration || ' days')::INTERVAL;

  -- Deduct ACoin
  UPDATE profiles
  SET acoin = acoin - v_plan_price
  WHERE id = v_user_id
  RETURNING acoin INTO v_new_acoin;

  -- Upsert subscription record (update if exists, insert if not)
  INSERT INTO user_subscriptions (user_id, plan_id, started_at, expires_at, is_active, acoin_paid)
  VALUES (v_user_id, p_plan_id, now(), v_expires_at, true, v_plan_price)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    plan_id = EXCLUDED.plan_id,
    started_at = now(),
    expires_at = EXCLUDED.expires_at,
    is_active = true,
    acoin_paid = EXCLUDED.acoin_paid;

  -- Grant verification if plan includes it (premium verification = expires with subscription)
  IF v_grants_verification THEN
    UPDATE profiles
    SET is_verified = true,
        verification_source = 'premium'
    WHERE id = v_user_id
    AND (verification_source IS NULL OR verification_source != 'manual'); -- Don't overwrite manual verification
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