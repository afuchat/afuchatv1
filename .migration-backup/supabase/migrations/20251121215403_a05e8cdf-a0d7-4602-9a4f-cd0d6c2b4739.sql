-- Rename XP to Nexa and add ACoin currency system
-- Add ACoin column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acoin INTEGER DEFAULT 0;

-- Add conversion rate settings table
CREATE TABLE IF NOT EXISTS public.currency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nexa_to_acoin_rate DECIMAL(10,4) DEFAULT 100.0, -- 100 Nexa = 1 ACoin
  conversion_fee_percent DECIMAL(5,2) DEFAULT 3.0, -- 3% fee
  p2p_fee_percent DECIMAL(5,2) DEFAULT 1.5, -- 1.5% fee for P2P transactions
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.currency_settings (nexa_to_acoin_rate, conversion_fee_percent, p2p_fee_percent)
VALUES (100.0, 3.0, 1.5)
ON CONFLICT DO NOTHING;

-- Create ACoin transaction log
CREATE TABLE IF NOT EXISTS public.acoin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'conversion', 'purchase', 'gift', 'earning'
  nexa_spent INTEGER, -- if converted from Nexa
  fee_charged INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create conversion function
CREATE OR REPLACE FUNCTION public.convert_nexa_to_acoin(
  p_nexa_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_nexa INTEGER;
  v_conversion_rate DECIMAL(10,4);
  v_fee_percent DECIMAL(5,2);
  v_fee_amount INTEGER;
  v_nexa_after_fee INTEGER;
  v_acoin_received INTEGER;
  v_new_nexa INTEGER;
  v_new_acoin INTEGER;
BEGIN
  -- Get user's current Nexa
  SELECT xp INTO v_user_nexa
  FROM public.profiles
  WHERE id = v_user_id;
  
  IF v_user_nexa < p_nexa_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient Nexa balance'
    );
  END IF;
  
  -- Get conversion settings
  SELECT nexa_to_acoin_rate, conversion_fee_percent
  INTO v_conversion_rate, v_fee_percent
  FROM public.currency_settings
  LIMIT 1;
  
  -- Calculate fee and ACoin received
  v_fee_amount := CEIL(p_nexa_amount * v_fee_percent / 100.0);
  v_nexa_after_fee := p_nexa_amount - v_fee_amount;
  v_acoin_received := FLOOR(v_nexa_after_fee / v_conversion_rate);
  
  IF v_acoin_received < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Conversion amount too small. Minimum ' || CEIL(v_conversion_rate + (v_conversion_rate * v_fee_percent / 100.0)) || ' Nexa required'
    );
  END IF;
  
  -- Deduct Nexa
  UPDATE public.profiles
  SET xp = xp - p_nexa_amount
  WHERE id = v_user_id
  RETURNING xp INTO v_new_nexa;
  
  -- Add ACoin
  UPDATE public.profiles
  SET acoin = acoin + v_acoin_received
  WHERE id = v_user_id
  RETURNING acoin INTO v_new_acoin;
  
  -- Log transaction
  INSERT INTO public.acoin_transactions (user_id, amount, transaction_type, nexa_spent, fee_charged, metadata)
  VALUES (v_user_id, v_acoin_received, 'conversion', p_nexa_amount, v_fee_amount, jsonb_build_object('conversion_rate', v_conversion_rate));
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully converted ' || p_nexa_amount || ' Nexa to ' || v_acoin_received || ' ACoin',
    'nexa_spent', p_nexa_amount,
    'fee_charged', v_fee_amount,
    'acoin_received', v_acoin_received,
    'new_nexa_balance', v_new_nexa,
    'new_acoin_balance', v_new_acoin
  );
END;
$$;

-- Enable RLS
ALTER TABLE public.acoin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own ACoin transactions"
ON public.acoin_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view currency settings"
ON public.currency_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can update currency settings"
ON public.currency_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);