-- Add warning and ban status to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_warned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS warned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS warned_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS warning_reason text,
ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS ban_reason text;

-- Create function to warn a user (admin only)
CREATE OR REPLACE FUNCTION public.admin_warn_user(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;
  
  -- Cannot warn yourself
  IF v_admin_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot warn yourself');
  END IF;
  
  -- Update user warning status
  UPDATE profiles
  SET is_warned = true,
      warned_at = now(),
      warned_by = v_admin_id,
      warning_reason = p_reason
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'User warned successfully');
END;
$$;

-- Create function to remove warning (admin only)
CREATE OR REPLACE FUNCTION public.admin_remove_warning(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;
  
  UPDATE profiles
  SET is_warned = false,
      warned_at = null,
      warned_by = null,
      warning_reason = null
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Warning removed');
END;
$$;

-- Create function to ban a user (admin only)
CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;
  
  IF v_admin_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot ban yourself');
  END IF;
  
  UPDATE profiles
  SET is_banned = true,
      banned_at = now(),
      banned_by = v_admin_id,
      ban_reason = p_reason
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'User banned successfully');
END;
$$;

-- Create function to unban a user (admin only)
CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;
  
  UPDATE profiles
  SET is_banned = false,
      banned_at = null,
      banned_by = null,
      ban_reason = null
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'User unbanned successfully');
END;
$$;