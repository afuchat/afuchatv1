-- Enable realtime for bids table
ALTER TABLE bids REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;

-- Create marketplace_listings table for reselling items
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_item_id uuid NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES user_shop_purchases(id) ON DELETE CASCADE,
  asking_price integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active marketplace listings"
  ON marketplace_listings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own listings"
  ON marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
  ON marketplace_listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
  ON marketplace_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_marketplace_listings_user_id ON marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_shop_item_id ON marketplace_listings(shop_item_id);
CREATE INDEX idx_marketplace_listings_active ON marketplace_listings(is_active) WHERE is_active = true;

-- Function to create marketplace listing
CREATE OR REPLACE FUNCTION create_marketplace_listing(
  p_purchase_id uuid,
  p_asking_price integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_purchase RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get purchase details and verify ownership
  SELECT usp.*, si.name as item_name
  INTO v_purchase
  FROM user_shop_purchases usp
  JOIN shop_items si ON si.id = usp.shop_item_id
  WHERE usp.id = p_purchase_id
    AND usp.user_id = v_user_id;

  IF v_purchase.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Purchase not found or you do not own this item'
    );
  END IF;

  -- Check if already listed
  IF EXISTS (
    SELECT 1 FROM marketplace_listings
    WHERE purchase_id = p_purchase_id
      AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This item is already listed on the marketplace'
    );
  END IF;

  -- Validate price
  IF p_asking_price <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Asking price must be greater than 0'
    );
  END IF;

  -- Create listing
  INSERT INTO marketplace_listings (user_id, shop_item_id, purchase_id, asking_price)
  VALUES (v_user_id, v_purchase.shop_item_id, p_purchase_id, p_asking_price);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Item listed on marketplace successfully!'
  );
END;
$$;

-- Function to purchase marketplace item
CREATE OR REPLACE FUNCTION purchase_marketplace_item(p_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer_id UUID := auth.uid();
  v_listing RECORD;
  v_buyer_xp INTEGER;
  v_new_buyer_xp INTEGER;
  v_new_seller_xp INTEGER;
  v_buyer_grade TEXT;
  v_seller_grade TEXT;
BEGIN
  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get listing details
  SELECT ml.*, si.name as item_name
  INTO v_listing
  FROM marketplace_listings ml
  JOIN shop_items si ON si.id = ml.shop_item_id
  WHERE ml.id = p_listing_id
    AND ml.is_active = true;

  IF v_listing.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Listing not found or no longer available'
    );
  END IF;

  -- Can't buy your own listing
  IF v_buyer_id = v_listing.user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot purchase your own listing'
    );
  END IF;

  -- Check if buyer already owns this item
  IF EXISTS (
    SELECT 1 FROM user_shop_purchases
    WHERE user_id = v_buyer_id
      AND shop_item_id = v_listing.shop_item_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already own this item'
    );
  END IF;

  -- Get buyer's XP
  SELECT xp INTO v_buyer_xp
  FROM profiles
  WHERE id = v_buyer_id;

  IF v_buyer_xp < v_listing.asking_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient XP',
      'required_xp', v_listing.asking_price,
      'current_xp', v_buyer_xp
    );
  END IF;

  -- Deduct XP from buyer
  v_new_buyer_xp := v_buyer_xp - v_listing.asking_price;
  v_buyer_grade := calculate_grade(v_new_buyer_xp);
  
  UPDATE profiles
  SET xp = v_new_buyer_xp, current_grade = v_buyer_grade
  WHERE id = v_buyer_id;

  -- Add XP to seller
  UPDATE profiles
  SET xp = xp + v_listing.asking_price
  WHERE id = v_listing.user_id
  RETURNING xp INTO v_new_seller_xp;

  v_seller_grade := calculate_grade(v_new_seller_xp);
  UPDATE profiles
  SET current_grade = v_seller_grade
  WHERE id = v_listing.user_id;

  -- Create new purchase record for buyer
  INSERT INTO user_shop_purchases (user_id, shop_item_id, xp_paid)
  VALUES (v_buyer_id, v_listing.shop_item_id, v_listing.asking_price);

  -- Deactivate listing
  UPDATE marketplace_listings
  SET is_active = false
  WHERE id = p_listing_id;

  -- Create notification for seller
  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (v_listing.user_id, v_buyer_id, 'gift');

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Purchase successful!',
    'item_name', v_listing.item_name,
    'xp_paid', v_listing.asking_price,
    'new_xp', v_new_buyer_xp,
    'new_grade', v_buyer_grade
  );
END;
$$;