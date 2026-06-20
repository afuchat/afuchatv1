-- Create function to handle marketplace gift purchases
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
  v_result json;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = p_listing_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found or inactive');
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

  -- Create gift transaction (buyer receives gift from seller)
  INSERT INTO gift_transactions (gift_id, sender_id, receiver_id, xp_cost)
  VALUES (v_listing.gift_id, v_listing.user_id, p_buyer_id, v_listing.asking_price);

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

  RETURN json_build_object(
    'success', true, 
    'message', 'Gift purchased successfully',
    'transaction', json_build_object(
      'gift_id', v_listing.gift_id,
      'price', v_listing.asking_price
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_marketplace_gift TO authenticated;