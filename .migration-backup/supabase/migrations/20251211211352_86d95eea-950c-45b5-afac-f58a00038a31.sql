-- Add payment info columns to profiles table for saved withdrawal details
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS withdrawal_phone TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_network TEXT;