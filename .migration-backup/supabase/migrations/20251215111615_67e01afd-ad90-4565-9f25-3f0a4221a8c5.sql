-- Add is_anonymous column to gift_transactions
ALTER TABLE public.gift_transactions 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;