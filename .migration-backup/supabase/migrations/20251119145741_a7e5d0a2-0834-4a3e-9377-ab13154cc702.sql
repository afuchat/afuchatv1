-- Fix search_path security issue for process_xp_transfer function
DROP FUNCTION IF EXISTS public.process_xp_transfer(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.process_xp_transfer(
  p_receiver_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_xp INTEGER;
  v_transfer_id UUID;
BEGIN
  v_sender_id := auth.uid();
  
  -- Check if sender has enough XP
  SELECT xp INTO v_sender_xp FROM public.profiles WHERE id = v_sender_id;
  
  IF v_sender_xp < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient XP balance'
    );
  END IF;
  
  -- Deduct XP from sender
  UPDATE public.profiles
  SET xp = xp - p_amount
  WHERE id = v_sender_id;
  
  -- Add XP to receiver
  UPDATE public.profiles
  SET xp = xp + p_amount
  WHERE id = p_receiver_id;
  
  -- Record transfer
  INSERT INTO public.xp_transfers (sender_id, receiver_id, amount, message)
  VALUES (v_sender_id, p_receiver_id, p_amount, p_message)
  RETURNING id INTO v_transfer_id;
  
  RETURN json_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'message', 'Transfer completed successfully'
  );
END;
$$;