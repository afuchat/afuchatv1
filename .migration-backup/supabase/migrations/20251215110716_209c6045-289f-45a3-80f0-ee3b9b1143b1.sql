-- Update purchase_marketplace_gift function to add notification and remove seller's gift
CREATE OR REPLACE FUNCTION purchase_marketplace_gift(
  p_listing_id uuid,
  p_buyer_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing record;
  v_buyer_xp integer;
  v_seller_xp integer;
  v_gift_name text;
  v_old_tx_id uuid;
BEGIN
  -- Get listing details with gift name
  SELECT ml.*, g.name as gift_name INTO v_listing
  FROM marketplace_listings ml
  JOIN gifts g ON g.id = ml.gift_id
  WHERE ml.id = p_listing_id AND ml.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found or inactive');
  END IF;

  -- Prevent buying own listing
  IF v_listing.user_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot purchase your own listing');
  END IF;

  -- Check buyer has enough Nexa
  SELECT xp INTO v_buyer_xp
  FROM profiles
  WHERE id = p_buyer_id;

  IF v_buyer_xp < v_listing.asking_price THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient Nexa balance');
  END IF;

  -- Get seller's current XP
  SELECT xp INTO v_seller_xp
  FROM profiles
  WHERE id = v_listing.user_id;

  -- Deduct Nexa from buyer
  UPDATE profiles
  SET xp = xp - v_listing.asking_price
  WHERE id = p_buyer_id;

  -- Add Nexa to seller
  UPDATE profiles
  SET xp = xp + v_listing.asking_price
  WHERE id = v_listing.user_id;

  -- Find and delete the most recent gift transaction for seller (removes gift from their profile)
  SELECT id INTO v_old_tx_id
  FROM gift_transactions
  WHERE gift_id = v_listing.gift_id
    AND receiver_id = v_listing.user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_old_tx_id IS NOT NULL THEN
    DELETE FROM gift_transactions WHERE id = v_old_tx_id;
  END IF;

  -- Create new gift transaction (buyer receives gift)
  INSERT INTO gift_transactions (gift_id, sender_id, receiver_id, xp_cost, message)
  VALUES (v_listing.gift_id, v_listing.user_id, p_buyer_id, v_listing.asking_price, 'Purchased from marketplace');

  -- Mark listing as inactive
  UPDATE marketplace_listings
  SET is_active = false, updated_at = now()
  WHERE id = p_listing_id;

  -- Update gift statistics with last sale price
  INSERT INTO gift_statistics (gift_id, last_sale_price, last_updated)
  VALUES (v_listing.gift_id, v_listing.asking_price, now())
  ON CONFLICT (gift_id) 
  DO UPDATE SET 
    last_sale_price = EXCLUDED.last_sale_price,
    last_updated = EXCLUDED.last_updated;

  -- Create notification for seller about the sale
  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (v_listing.user_id, p_buyer_id, 'gift');

  RETURN json_build_object(
    'success', true, 
    'message', 'Gift purchased successfully',
    'transaction', json_build_object(
      'gift_id', v_listing.gift_id,
      'price', v_listing.asking_price,
      'gift_name', v_listing.gift_name
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;