-- Add date_of_birth column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.profiles.date_of_birth IS 'User date of birth for age verification and eligibility';