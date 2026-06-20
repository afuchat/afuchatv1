-- Add a trigger to prevent case variations (index already exists)
CREATE OR REPLACE FUNCTION check_handle_case_insensitive()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_case_check ON profiles;

CREATE TRIGGER handle_case_check
BEFORE INSERT OR UPDATE OF handle ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_handle_case_insensitive();