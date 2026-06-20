-- Function to record login history
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_user_id UUID,
  p_success BOOLEAN DEFAULT true,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_login_id UUID;
BEGIN
  INSERT INTO public.login_history (
    user_id,
    success,
    ip_address,
    user_agent,
    location,
    login_time
  )
  VALUES (
    p_user_id,
    p_success,
    p_ip_address,
    p_user_agent,
    p_location,
    NOW()
  )
  RETURNING id INTO v_login_id;
  
  RETURN v_login_id;
END;
$$;

-- Function to create/update active session
CREATE OR REPLACE FUNCTION public.upsert_active_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_default_expiry TIMESTAMPTZ;
BEGIN
  -- Default expiry is 7 days from now if not provided
  v_default_expiry := COALESCE(p_expires_at, NOW() + INTERVAL '7 days');
  
  -- Try to update existing session
  UPDATE public.active_sessions
  SET 
    last_active = NOW(),
    expires_at = v_default_expiry,
    device_name = COALESCE(p_device_name, device_name),
    browser = COALESCE(p_browser, browser),
    ip_address = COALESCE(p_ip_address, ip_address)
  WHERE session_token = p_session_token
  RETURNING id INTO v_session_id;
  
  -- If no session exists, create new one
  IF v_session_id IS NULL THEN
    INSERT INTO public.active_sessions (
      user_id,
      session_token,
      device_name,
      browser,
      ip_address,
      expires_at,
      last_active
    )
    VALUES (
      p_user_id,
      p_session_token,
      p_device_name,
      p_browser,
      p_ip_address,
      v_default_expiry,
      NOW()
    )
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.active_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;