-- Create function to send multiple gifts at once with combo discount
CREATE OR REPLACE FUNCTION send_gift_combo(
  p_gift_ids uuid[],
  p_receiver_id uuid,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_id uuid;
  v_sender_xp integer;
  v_total_cost integer := 0;
  v_discounted_cost integer;
  v_discount_percent numeric;
  v_gift_count integer;
  v_new_xp integer;
  v_new_grade text;
  v_gift_id uuid;
  v_gift_cost integer;
  v_gift_multiplier numeric;
BEGIN
  -- Get sender ID
  v_sender_id := auth.uid();
  
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Can't send gifts to yourself
  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot send gifts to yourself'
    );
  END IF;

  -- Get gift count
  v_gift_count := array_length(p_gift_ids, 1);
  
  IF v_gift_count IS NULL OR v_gift_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No gifts selected'
    );
  END IF;

  -- Calculate total cost with multipliers
  FOREACH v_gift_id IN ARRAY p_gift_ids
  LOOP
    SELECT 
      g.base_xp_cost,
      COALESCE(gs.price_multiplier, 1.00)
    INTO v_gift_cost, v_gift_multiplier
    FROM gifts g
    LEFT JOIN gift_statistics gs ON gs.gift_id = g.id
    WHERE g.id = v_gift_id;
    
    IF v_gift_cost IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Invalid gift selected'
      );
    END IF;
    
    v_total_cost := v_total_cost + CEIL(v_gift_cost * v_gift_multiplier);
  END LOOP;

  -- Apply combo discount: 5% off for 2-3 gifts, 10% for 4-5, 15% for 6+
  IF v_gift_count >= 6 THEN
    v_discount_percent := 0.15;
  ELSIF v_gift_count >= 4 THEN
    v_discount_percent := 0.10;
  ELSIF v_gift_count >= 2 THEN
    v_discount_percent := 0.05;
  ELSE
    v_discount_percent := 0;
  END IF;

  v_discounted_cost := CEIL(v_total_cost * (1 - v_discount_percent));

  -- Get sender's current XP
  SELECT xp INTO v_sender_xp
  FROM profiles
  WHERE id = v_sender_id;

  -- Check if sender has enough XP
  IF v_sender_xp < v_discounted_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient XP'
    );
  END IF;

  -- Deduct XP from sender
  UPDATE profiles
  SET xp = xp - v_discounted_cost
  WHERE id = v_sender_id
  RETURNING xp INTO v_new_xp;

  -- Update sender's grade based on new XP
  UPDATE profiles
  SET current_grade = CASE
    WHEN v_new_xp >= 10000 THEN 'Legend'
    WHEN v_new_xp >= 5000 THEN 'Master'
    WHEN v_new_xp >= 2500 THEN 'Expert'
    WHEN v_new_xp >= 1000 THEN 'Advanced'
    WHEN v_new_xp >= 500 THEN 'Intermediate'
    WHEN v_new_xp >= 100 THEN 'Beginner'
    ELSE 'Newcomer'
  END
  WHERE id = v_sender_id
  RETURNING current_grade INTO v_new_grade;

  -- Insert gift transactions for each gift
  FOREACH v_gift_id IN ARRAY p_gift_ids
  LOOP
    SELECT CEIL(g.base_xp_cost * COALESCE(gs.price_multiplier, 1.00))
    INTO v_gift_cost
    FROM gifts g
    LEFT JOIN gift_statistics gs ON gs.gift_id = g.id
    WHERE g.id = v_gift_id;

    INSERT INTO gift_transactions (sender_id, receiver_id, gift_id, xp_cost, message)
    VALUES (v_sender_id, p_receiver_id, v_gift_id, v_gift_cost, p_message);

    -- Update gift statistics
    INSERT INTO gift_statistics (gift_id, total_sent, price_multiplier)
    VALUES (v_gift_id, 1, 1.0)
    ON CONFLICT (gift_id) DO UPDATE
    SET 
      total_sent = gift_statistics.total_sent + 1,
      price_multiplier = LEAST(
        GREATEST(1.0 + (gift_statistics.total_sent + 1)::numeric * 0.01, 1.0),
        3.0
      ),
      last_updated = now();
  END LOOP;

  -- Create notification for receiver
  INSERT INTO notifications (user_id, actor_id, type, post_id)
  VALUES (p_receiver_id, v_sender_id, 'gift', NULL);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gift combo sent successfully',
    'gift_count', v_gift_count,
    'original_cost', v_total_cost,
    'discounted_cost', v_discounted_cost,
    'discount_percent', v_discount_percent * 100,
    'new_xp', v_new_xp,
    'new_grade', v_new_grade
  );
END;
$$;