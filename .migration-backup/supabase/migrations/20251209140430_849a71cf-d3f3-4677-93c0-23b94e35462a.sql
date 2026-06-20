-- Fix referrals table foreign keys to point to profiles instead of auth.users
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;

ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referrer_id_fkey 
FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referred_id_fkey 
FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE CASCADE;