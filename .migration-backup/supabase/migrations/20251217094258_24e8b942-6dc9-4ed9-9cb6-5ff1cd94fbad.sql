-- Fix user with expired subscription who still has is_verified = true
UPDATE profiles 
SET is_verified = false, verification_source = NULL
WHERE id = '37d81410-db88-4ae5-af5b-7af84ff4849b' 
  AND is_verified = true;