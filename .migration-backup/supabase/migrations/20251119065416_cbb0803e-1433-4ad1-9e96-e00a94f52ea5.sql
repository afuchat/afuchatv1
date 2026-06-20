-- Remove unnecessary business-specific columns from profiles
-- Keep only is_business_mode and is_affiliate as flags
ALTER TABLE profiles 
DROP COLUMN IF EXISTS business_name,
DROP COLUMN IF EXISTS business_logo_url,
DROP COLUMN IF EXISTS business_description,
DROP COLUMN IF EXISTS business_website_url,
DROP COLUMN IF EXISTS affiliate_business_name,
DROP COLUMN IF EXISTS affiliate_business_logo;