-- Add seasonal columns to gifts table
ALTER TABLE public.gifts
ADD COLUMN available_from DATE DEFAULT NULL,
ADD COLUMN available_until DATE DEFAULT NULL,
ADD COLUMN season TEXT DEFAULT NULL;

-- Create function to calculate grade based on XP
CREATE OR REPLACE FUNCTION public.calculate_grade(p_xp INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_xp >= 5000 THEN
    RETURN 'Legend';
  ELSIF p_xp >= 1000 THEN
    RETURN 'Elite Creator';
  ELSIF p_xp >= 500 THEN
    RETURN 'Community Builder';
  ELSIF p_xp >= 100 THEN
    RETURN 'Active Chatter';
  ELSE
    RETURN 'Newcomer';
  END IF;
END;
$$;

-- Update send_gift function to also update grade
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
  v_new_xp INTEGER;
  v_new_grade TEXT;
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
  
  -- Calculate new XP and grade
  v_new_xp := v_sender_xp - v_gift_price;
  v_new_grade := calculate_grade(v_new_xp);
  
  -- Deduct XP from sender and update grade
  UPDATE public.profiles
  SET 
    xp = v_new_xp,
    current_grade = v_new_grade
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
    'new_xp', v_new_xp,
    'new_grade', v_new_grade,
    'new_price_multiplier', v_new_multiplier
  );
END;
$$;