-- Add phone number field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Add check constraint for phone number format (international format with country code)
ALTER TABLE profiles ADD CONSTRAINT check_phone_number_format 
  CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$');