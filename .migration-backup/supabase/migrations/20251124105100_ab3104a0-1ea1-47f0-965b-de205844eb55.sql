-- Drop existing calculate_grade function
DROP FUNCTION IF EXISTS public.calculate_grade(integer);

-- Create new calculate_grade function with updated thresholds
CREATE OR REPLACE FUNCTION public.calculate_grade(xp_amount integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF xp_amount >= 15000 THEN
    RETURN 'Legend';
  ELSIF xp_amount >= 5000 THEN
    RETURN 'Elite Creator';
  ELSIF xp_amount >= 2000 THEN
    RETURN 'Community Builder';
  ELSIF xp_amount >= 500 THEN
    RETURN 'Active Chatter';
  ELSE
    RETURN 'Newcomer';
  END IF;
END;
$$;

-- Update the award_xp function to use the new grade calculation
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_action_type text,
  p_xp_amount integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_xp integer;
  v_new_grade text;
BEGIN
  -- Update user's XP
  UPDATE profiles
  SET xp = xp + p_xp_amount
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Calculate new grade
  v_new_grade := calculate_grade(v_new_xp);

  -- Update grade if changed
  UPDATE profiles
  SET current_grade = v_new_grade
  WHERE id = p_user_id AND current_grade != v_new_grade;

  -- Log the activity
  INSERT INTO user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (p_user_id, p_action_type, p_xp_amount, p_metadata);
END;
$$;