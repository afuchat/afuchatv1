-- Fix security issue: Set search_path for the function using CREATE OR REPLACE
CREATE OR REPLACE FUNCTION check_handle_case_insensitive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if a handle with different case already exists
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(handle) = LOWER(NEW.handle) 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Username already taken (case-insensitive)';
  END IF;
  RETURN NEW;
END;
$$;