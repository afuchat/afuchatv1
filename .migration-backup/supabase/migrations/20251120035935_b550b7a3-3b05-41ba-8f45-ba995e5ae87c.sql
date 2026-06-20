-- Add new fields for business and influencer verification details
ALTER TABLE verification_requests
ADD COLUMN IF NOT EXISTS business_registration TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS primary_platform TEXT,
ADD COLUMN IF NOT EXISTS follower_count TEXT,
ADD COLUMN IF NOT EXISTS engagement_rate TEXT;