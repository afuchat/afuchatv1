-- Add country field to profiles table
ALTER TABLE profiles ADD COLUMN country TEXT;

-- Create index for faster queries
CREATE INDEX idx_profiles_country ON profiles(country);

COMMENT ON COLUMN profiles.country IS 'User country/location';
