-- Create gifts table
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  base_xp_cost INTEGER NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create gift_transactions table
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_id UUID NOT NULL REFERENCES public.gifts(id),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  xp_cost INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create gift_statistics table to track popularity and dynamic pricing
CREATE TABLE IF NOT EXISTS public.gift_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_id UUID NOT NULL REFERENCES public.gifts(id) UNIQUE,
  total_sent INTEGER NOT NULL DEFAULT 0,
  price_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gifts (everyone can view)
CREATE POLICY "Anyone can view gifts"
  ON public.gifts FOR SELECT
  USING (true);

-- RLS Policies for gift_transactions
CREATE POLICY "Users can view their sent gifts"
  ON public.gift_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send gifts"
  ON public.gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for gift_statistics (everyone can view)
CREATE POLICY "Anyone can view gift statistics"
  ON public.gift_statistics FOR SELECT
  USING (true);

-- Insert initial gifts
INSERT INTO public.gifts (name, emoji, base_xp_cost, rarity, description) VALUES
  ('Rose', '🌹', 10, 'common', 'A beautiful rose to show appreciation'),
  ('Candy', '🍬', 5, 'common', 'Sweet candy for your sweet friend'),
  ('Christmas Tree', '🎄', 50, 'rare', 'A festive Christmas tree for special occasions'),
  ('Heart', '❤️', 15, 'common', 'Show your love with a heart'),
  ('Trophy', '🏆', 100, 'legendary', 'Award excellence with a trophy'),
  ('Diamond', '💎', 200, 'legendary', 'The ultimate gift of appreciation');

-- Initialize gift statistics
INSERT INTO public.gift_statistics (gift_id, total_sent, price_multiplier)
SELECT id, 0, 1.00 FROM public.gifts;

-- Function to calculate current gift price
CREATE OR REPLACE FUNCTION public.get_gift_price(p_gift_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_cost INTEGER;
  v_multiplier DECIMAL(3,2);
  v_final_price INTEGER;
BEGIN
  SELECT g.base_xp_cost, COALESCE(gs.price_multiplier, 1.00)
  INTO v_base_cost, v_multiplier
  FROM public.gifts g
  LEFT JOIN public.gift_statistics gs ON gs.gift_id = g.id
  WHERE g.id = p_gift_id;
  
  v_final_price := CEIL(v_base_cost * v_multiplier);
  
  RETURN v_final_price;
END;
$$;

-- Function to send gift
CREATE OR REPLACE FUNCTION public.send_gift(
  p_gift_id UUID,
  p_receiver_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_sender_xp INTEGER;
  v_gift_price INTEGER;
  v_new_multiplier DECIMAL(3,2);
BEGIN
  -- Validate sender is not receiver
  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You cannot send a gift to yourself'
    );
  END IF;
  
  -- Get current gift price
  v_gift_price := get_gift_price(p_gift_id);
  
  -- Check if sender has enough XP
  SELECT xp INTO v_sender_xp
  FROM public.profiles
  WHERE id = v_sender_id;
  
  IF v_sender_xp < v_gift_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient XP to send this gift',
      'required_xp', v_gift_price,
      'current_xp', v_sender_xp
    );
  END IF;
  
  -- Deduct XP from sender
  UPDATE public.profiles
  SET xp = xp - v_gift_price
  WHERE id = v_sender_id;
  
  -- Record transaction
  INSERT INTO public.gift_transactions (gift_id, sender_id, receiver_id, xp_cost, message)
  VALUES (p_gift_id, v_sender_id, p_receiver_id, v_gift_price, p_message);
  
  -- Update gift statistics and increase price multiplier
  UPDATE public.gift_statistics
  SET 
    total_sent = total_sent + 1,
    price_multiplier = LEAST(price_multiplier + 0.01, 3.00),
    last_updated = now()
  WHERE gift_id = p_gift_id
  RETURNING price_multiplier INTO v_new_multiplier;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gift sent successfully!',
    'xp_cost', v_gift_price,
    'new_price_multiplier', v_new_multiplier
  );
END;
$$;