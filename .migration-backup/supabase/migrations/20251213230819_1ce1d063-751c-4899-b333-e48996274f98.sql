-- Create function to allow users to cancel their active subscription
CREATE OR REPLACE FUNCTION cancel_active_subscription()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cancelled_count INTEGER;
BEGIN
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Deactivate any currently active, non-expired subscriptions for this user
  UPDATE user_subscriptions
  SET is_active = false
  WHERE user_id = v_user_id
    AND is_active = true
    AND expires_at > now()
  RETURNING 1 INTO v_cancelled_count;

  IF v_cancelled_count IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active subscription to cancel'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription cancelled successfully'
  );
END;
$$;