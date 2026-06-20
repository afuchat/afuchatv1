-- Update verified users with null verification_source to 'manual'
UPDATE profiles 
SET verification_source = 'manual' 
WHERE is_verified = true AND verification_source IS NULL;