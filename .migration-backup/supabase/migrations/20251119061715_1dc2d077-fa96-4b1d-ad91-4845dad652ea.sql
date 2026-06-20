-- Add account mode tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN active_account_mode text DEFAULT 'personal' CHECK (active_account_mode IN ('personal', 'business'));

-- Create index for better performance
CREATE INDEX idx_profiles_active_account_mode ON public.profiles(active_account_mode);

COMMENT ON COLUMN public.profiles.active_account_mode IS 'Tracks whether user is currently viewing as personal or business account';
