-- Drop the existing function first
DROP FUNCTION IF EXISTS public.purchase_marketplace_gift(uuid, uuid);

-- Recreate purchase_marketplace_gift to notify seller and remove gift from gallery
CREATE OR REPLACE FUNCTION public.purchase_marketplace_gift(
  p_listing_id uuid,
  p_buyer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_buyer_xp integer;
  v_gift RECORD;
  v_old_tx_id uuid;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing FROM marketplace_listings WHERE id = p_listing_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Listing not found or inactive');
  END IF;

  -- Prevent buying own listing
  IF v_listing.user_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot purchase your own listing');
  END IF;

  -- Get buyer's XP
  SELECT xp INTO v_buyer_xp FROM profiles WHERE id = p_buyer_id;
  IF v_buyer_xp < v_listing.asking_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient Nexa balance');
  END IF;

  -- Get gift details
  SELECT * INTO v_gift FROM gifts WHERE id = v_listing.gift_id;

  -- Find the seller's original gift transaction to delete
  SELECT id INTO v_old_tx_id FROM gift_transactions 
  WHERE receiver_id = v_listing.user_id AND gift_id = v_listing.gift_id
  ORDER BY created_at DESC LIMIT 1;

  -- Delete the seller's gift transaction (removes from their gallery)
  IF v_old_tx_id IS NOT NULL THEN
    DELETE FROM gift_transactions WHERE id = v_old_tx_id;
  END IF;

  -- Deduct from buyer
  UPDATE profiles SET xp = xp - v_listing.asking_price WHERE id = p_buyer_id;

  -- Add to seller (with small platform fee of 5%)
  UPDATE profiles SET xp = xp + FLOOR(v_listing.asking_price * 0.95) WHERE id = v_listing.user_id;

  -- Create new gift transaction for buyer
  INSERT INTO gift_transactions (gift_id, sender_id, receiver_id, xp_cost, message)
  VALUES (v_listing.gift_id, v_listing.user_id, p_buyer_id, v_listing.asking_price, 'Purchased from marketplace');

  -- Update gift statistics with last sale price
  UPDATE gift_statistics 
  SET last_sale_price = v_listing.asking_price, last_updated = now()
  WHERE gift_id = v_listing.gift_id;

  -- If no stats exist, create them
  INSERT INTO gift_statistics (gift_id, last_sale_price, total_sent, price_multiplier)
  VALUES (v_listing.gift_id, v_listing.asking_price, 0, 1.0)
  ON CONFLICT (gift_id) DO NOTHING;

  -- Deactivate the listing
  UPDATE marketplace_listings SET is_active = false, updated_at = now() WHERE id = p_listing_id;

  -- Create notification for seller about the sale
  INSERT INTO notifications (user_id, type, actor_id)
  VALUES (v_listing.user_id, 'gift', p_buyer_id);

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Gift purchased successfully',
    'gift_name', v_gift.name,
    'price_paid', v_listing.asking_price
  );
END;
$$;