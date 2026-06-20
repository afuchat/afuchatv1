-- Add business_category column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_category TEXT;

COMMENT ON COLUMN profiles.business_category IS 'Category for business accounts (e.g., Restaurant, Tech Company, Retail, etc.)';