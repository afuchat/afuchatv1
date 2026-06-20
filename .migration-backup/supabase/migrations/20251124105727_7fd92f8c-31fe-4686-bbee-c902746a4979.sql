-- Add balance visibility preference to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_balance boolean DEFAULT true;