-- Step 1: Add business fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS business_description text,
ADD COLUMN IF NOT EXISTS business_logo_url text,
ADD COLUMN IF NOT EXISTS business_website_url text;

-- Step 2: Migrate data from business_accounts to profiles
UPDATE public.profiles p
SET 
  business_name = ba.name,
  business_description = ba.description,
  business_logo_url = ba.logo_url,
  business_website_url = ba.website_url,
  is_business_mode = true
FROM public.business_accounts ba
WHERE p.id = ba.owner_id;

-- Step 3: Update affiliate_requests to use profile references instead of business_accounts
-- First, add new column
ALTER TABLE public.affiliate_requests
ADD COLUMN IF NOT EXISTS business_profile_id uuid REFERENCES public.profiles(id);

-- Migrate existing data
UPDATE public.affiliate_requests ar
SET business_profile_id = ba.owner_id
FROM public.business_accounts ba
WHERE ar.business_id = ba.id;

-- Make the new column NOT NULL after migration
ALTER TABLE public.affiliate_requests
ALTER COLUMN business_profile_id SET NOT NULL;

-- Drop the old foreign key and column
ALTER TABLE public.affiliate_requests
DROP CONSTRAINT IF EXISTS affiliate_requests_business_id_fkey,
DROP COLUMN IF EXISTS business_id;

-- Step 4: Drop business_accounts table
DROP TABLE IF EXISTS public.business_accounts CASCADE;

-- Step 5: Create index for business profile searches
CREATE INDEX IF NOT EXISTS idx_profiles_business_mode ON public.profiles(is_business_mode) WHERE is_business_mode = true;
CREATE INDEX IF NOT EXISTS idx_profiles_verified_business ON public.profiles(is_business_mode, is_verified) WHERE is_business_mode = true;