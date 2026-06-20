-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  acoin_price INTEGER NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features JSONB DEFAULT '[]'::jsonb,
  grants_verification BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  acoin_paid INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, acoin_price, duration_days, features, grants_verification)
VALUES 
  ('Premium Monthly', 'Get verified badge and premium features for 30 days', 100, 30, 
   '["Verified badge", "Priority support", "Ad-free experience", "Exclusive content"]'::jsonb, true),
  ('Premium Quarterly', 'Get verified badge and premium features for 90 days (Save 20%)', 240, 90, 
   '["Verified badge", "Priority support", "Ad-free experience", "Exclusive content", "20% discount"]'::jsonb, true),
  ('Premium Yearly', 'Get verified badge and premium features for 365 days (Save 50%)', 600, 365, 
   '["Verified badge", "Priority support", "Ad-free experience", "Exclusive content", "50% discount"]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Function to purchase subscription with ACoin
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
  v_existing_subscription RECORD;
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

  -- Check for existing active subscription
  SELECT * INTO v_existing_subscription
  FROM user_subscriptions
  WHERE user_id = v_user_id 
    AND is_active = true 
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  -- Calculate expiration date
  IF v_existing_subscription IS NOT NULL THEN
    -- Extend existing subscription
    v_expires_at := v_existing_subscription.expires_at + (v_plan_duration || ' days')::INTERVAL;
  ELSE
    -- New subscription
    v_expires_at := now() + (v_plan_duration || ' days')::INTERVAL;
  END IF;

  -- Deduct ACoin
  UPDATE profiles
  SET acoin = acoin - v_plan_price
  WHERE id = v_user_id
  RETURNING acoin INTO v_new_acoin;

  -- Create subscription record
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

-- Function to check and expire subscriptions
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Deactivate expired subscriptions
  UPDATE user_subscriptions
  SET is_active = false
  WHERE is_active = true 
    AND expires_at <= now();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Remove verification from users whose subscriptions expired
  UPDATE profiles p
  SET is_verified = false
  WHERE is_verified = true
    AND NOT EXISTS (
      SELECT 1 FROM user_subscriptions us
      WHERE us.user_id = p.id
        AND us.is_active = true
        AND us.expires_at > now()
    );

  RETURN v_expired_count;
END;
$$;