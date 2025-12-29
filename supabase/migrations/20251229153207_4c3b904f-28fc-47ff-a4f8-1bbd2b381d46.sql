-- Create table to track PesaPal transactions
CREATE TABLE public.pesapal_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  merchant_reference TEXT NOT NULL UNIQUE,
  pesapal_tracking_id TEXT,
  acoin_amount INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  confirmation_code TEXT,
  acoin_credited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pesapal_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own pesapal transactions"
  ON public.pesapal_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (edge function)
CREATE POLICY "Service role can manage pesapal transactions"
  ON public.pesapal_transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_pesapal_transactions_user_id ON public.pesapal_transactions(user_id);
CREATE INDEX idx_pesapal_transactions_merchant_reference ON public.pesapal_transactions(merchant_reference);
CREATE INDEX idx_pesapal_transactions_status ON public.pesapal_transactions(status);

-- Trigger to update updated_at
CREATE TRIGGER update_pesapal_transactions_updated_at
  BEFORE UPDATE ON public.pesapal_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_preferences_updated_at();