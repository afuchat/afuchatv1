-- Create function to purchase a marketplace listing with ACoin
-- 4.99% transaction fee on each sale
CREATE OR REPLACE FUNCTION public.purchase_listing(
  p_listing_id uuid,
  p_buyer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing record;
  v_buyer_acoin integer;
  v_fee_percent numeric := 4.99;
  v_fee_amount integer;
  v_seller_receives integer;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing 
  FROM user_product_listings 
  WHERE id = p_listing_id AND is_available = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Listing not found or no longer available');
  END IF;
  
  -- Cannot buy own listing
  IF v_listing.seller_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'You cannot purchase your own listing');
  END IF;
  
  -- Get buyer's ACoin balance
  SELECT acoin INTO v_buyer_acoin FROM profiles WHERE id = p_buyer_id;
  
  IF v_buyer_acoin IS NULL OR v_buyer_acoin < v_listing.acoin_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient ACoin balance');
  END IF;
  
  -- Calculate fee (4.99%)
  v_fee_amount := CEIL(v_listing.acoin_price * v_fee_percent / 100);
  v_seller_receives := v_listing.acoin_price - v_fee_amount;
  
  -- Deduct ACoin from buyer
  UPDATE profiles 
  SET acoin = acoin - v_listing.acoin_price 
  WHERE id = p_buyer_id;
  
  -- Credit ACoin to seller (minus fee)
  UPDATE profiles 
  SET acoin = COALESCE(acoin, 0) + v_seller_receives 
  WHERE id = v_listing.seller_id;
  
  -- Record buyer transaction
  INSERT INTO acoin_transactions (user_id, amount, transaction_type, fee_charged, metadata)
  VALUES (
    p_buyer_id, 
    -v_listing.acoin_price, 
    'marketplace_purchase',
    0,
    jsonb_build_object(
      'listing_id', p_listing_id,
      'listing_title', v_listing.title,
      'seller_id', v_listing.seller_id
    )
  );
  
  -- Record seller transaction
  INSERT INTO acoin_transactions (user_id, amount, transaction_type, fee_charged, metadata)
  VALUES (
    v_listing.seller_id, 
    v_seller_receives, 
    'marketplace_sale',
    v_fee_amount,
    jsonb_build_object(
      'listing_id', p_listing_id,
      'listing_title', v_listing.title,
      'buyer_id', p_buyer_id,
      'gross_amount', v_listing.acoin_price,
      'fee_percent', v_fee_percent
    )
  );
  
  -- Mark listing as sold
  UPDATE user_product_listings 
  SET is_available = false, updated_at = now()
  WHERE id = p_listing_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Purchase successful!',
    'acoin_spent', v_listing.acoin_price,
    'fee_amount', v_fee_amount,
    'seller_received', v_seller_receives
  );
END;
$$;