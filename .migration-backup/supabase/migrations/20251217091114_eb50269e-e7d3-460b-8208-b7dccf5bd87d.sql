-- Add verification_source field to track how user got verified
-- 'manual' = admin approved verification request (permanent)
-- 'premium' = auto-verified via premium subscription (expires with subscription)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_source TEXT DEFAULT NULL;

-- Update existing verified users: assume they got it via premium if they have active subscription
-- otherwise mark as manual (grandfathered in)
UPDATE public.profiles p
SET verification_source = CASE 
  WHEN EXISTS (
    SELECT 1 FROM public.user_subscriptions us 
    WHERE us.user_id = p.id 
    AND us.is_active = true 
    AND us.expires_at > now()
  ) THEN 'premium'
  ELSE 'manual'
END
WHERE p.is_verified = true AND p.verification_source IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.verification_source IS 'How user got verified: manual (admin approved, permanent) or premium (via subscription, expires with it)';