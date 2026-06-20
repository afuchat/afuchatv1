-- Drop existing unique constraint if it exists on handle column
-- and create a new unique index on lowercase handles for case-insensitive uniqueness

-- First, check if there's an existing unique constraint and drop it
DO $$
BEGIN
  -- Drop existing index if it exists
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_handle_key') THEN
    DROP INDEX profiles_handle_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_handle_lower_idx') THEN
    DROP INDEX profiles_handle_lower_idx;
  END IF;
END $$;

-- Create unique index on lowercase handle for case-insensitive uniqueness
CREATE UNIQUE INDEX profiles_handle_lower_idx ON profiles (lower(handle));

-- Add a comment explaining the constraint
COMMENT ON INDEX profiles_handle_lower_idx IS 'Ensures usernames are unique regardless of case - @user and @USER are the same';