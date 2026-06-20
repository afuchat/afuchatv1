-- Drop the old text-based column
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS active_account_mode;

-- Add new boolean column for business mode
ALTER TABLE public.profiles 
ADD COLUMN is_business_mode boolean DEFAULT false NOT NULL;

-- Create index for better performance
CREATE INDEX idx_profiles_is_business_mode ON public.profiles(is_business_mode);

COMMENT ON COLUMN public.profiles.is_business_mode IS 'True when user is viewing as business account, false for personal account';
