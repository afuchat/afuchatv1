-- Enable RLS if not already enabled
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view referrals where they were referred" ON public.referrals;
DROP POLICY IF EXISTS "Allow referral inserts" ON public.referrals;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view their referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id);

-- Users can view referrals where they were referred
CREATE POLICY "Users can view referrals where they were referred"
ON public.referrals FOR SELECT
USING (auth.uid() = referred_id);

-- Allow insert for the process_referral_reward function
CREATE POLICY "Allow referral inserts"
ON public.referrals FOR INSERT
WITH CHECK (true);