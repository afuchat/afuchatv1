-- Add auction fields to shop_items
ALTER TABLE shop_items
ADD COLUMN is_auction boolean DEFAULT false,
ADD COLUMN auction_start_time timestamp with time zone,
ADD COLUMN auction_end_time timestamp with time zone,
ADD COLUMN starting_bid integer,
ADD COLUMN current_bid integer,
ADD COLUMN min_bid_increment integer DEFAULT 10;

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_item_id uuid NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bid_amount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on bids
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- RLS policies for bids
CREATE POLICY "Anyone can view bids"
  ON bids FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_bids_item_id ON bids(shop_item_id);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_shop_items_auction ON shop_items(is_auction, auction_end_time) WHERE is_auction = true;

-- Function to place a bid
CREATE OR REPLACE FUNCTION place_bid(p_shop_item_id uuid, p_bid_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_xp INTEGER;
  v_item RECORD;
  v_highest_bid INTEGER;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get item details
  SELECT * INTO v_item
  FROM shop_items
  WHERE id = p_shop_item_id
    AND is_auction = true
    AND is_available = true
    AND auction_start_time <= NOW()
    AND auction_end_time > NOW();

  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Auction not found or not active'
    );
  END IF;

  -- Get current highest bid
  SELECT COALESCE(MAX(bid_amount), v_item.starting_bid) INTO v_highest_bid
  FROM bids
  WHERE shop_item_id = p_shop_item_id;

  -- Validate bid amount
  IF p_bid_amount < v_highest_bid + v_item.min_bid_increment THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bid must be at least ' || (v_highest_bid + v_item.min_bid_increment) || ' XP',
      'min_bid', v_highest_bid + v_item.min_bid_increment
    );
  END IF;

  -- Check if user has enough XP
  SELECT xp INTO v_user_xp
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_xp < p_bid_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient XP',
      'required_xp', p_bid_amount,
      'current_xp', v_user_xp
    );
  END IF;

  -- Place the bid
  INSERT INTO bids (shop_item_id, user_id, bid_amount)
  VALUES (p_shop_item_id, v_user_id, p_bid_amount);

  -- Update current bid on item
  UPDATE shop_items
  SET current_bid = p_bid_amount
  WHERE id = p_shop_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bid placed successfully!',
    'bid_amount', p_bid_amount
  );
END;
$$;

-- Function to finalize auction (winner pays and receives item)
CREATE OR REPLACE FUNCTION finalize_auction(p_shop_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item RECORD;
  v_winner_id UUID;
  v_winning_bid INTEGER;
  v_winner_xp INTEGER;
BEGIN
  -- Get auction details
  SELECT * INTO v_item
  FROM shop_items
  WHERE id = p_shop_item_id
    AND is_auction = true
    AND auction_end_time <= NOW();

  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Auction not found or still active'
    );
  END IF;

  -- Get winning bid
  SELECT user_id, bid_amount INTO v_winner_id, v_winning_bid
  FROM bids
  WHERE shop_item_id = p_shop_item_id
  ORDER BY bid_amount DESC, created_at ASC
  LIMIT 1;

  IF v_winner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No bids placed'
    );
  END IF;

  -- Check if winner has enough XP
  SELECT xp INTO v_winner_xp
  FROM profiles
  WHERE id = v_winner_id;

  IF v_winner_xp < v_winning_bid THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Winner has insufficient XP'
    );
  END IF;

  -- Deduct XP from winner
  UPDATE profiles
  SET xp = xp - v_winning_bid
  WHERE id = v_winner_id;

  -- Record purchase
  INSERT INTO user_shop_purchases (user_id, shop_item_id, xp_paid)
  VALUES (v_winner_id, p_shop_item_id, v_winning_bid);

  -- Mark auction as unavailable
  UPDATE shop_items
  SET is_available = false
  WHERE id = p_shop_item_id;

  -- Create notification for winner
  INSERT INTO notifications (user_id, type)
  VALUES (v_winner_id, 'gift');

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Auction finalized',
    'winner_id', v_winner_id,
    'winning_bid', v_winning_bid
  );
END;
$$;

-- Insert some auction items
INSERT INTO shop_items (name, description, item_type, xp_cost, emoji, config, is_auction, auction_start_time, auction_end_time, starting_bid, current_bid, min_bid_increment)
VALUES 
  ('Diamond Wings', 'Ultra-rare legendary wings that shimmer with diamonds', 'accessory', 0, '💎', '{"accessory": "wings", "rarity": "legendary"}', true, NOW(), NOW() + INTERVAL '24 hours', 500, 500, 25),
  ('Galaxy Theme Pack', 'Exclusive cosmic theme with animated stars', 'theme', 0, '🌌', '{"colors": {"primary": "#1a0033", "secondary": "#8b00ff"}, "effects": ["stars", "nebula"]}', true, NOW(), NOW() + INTERVAL '48 hours', 300, 300, 20),
  ('Phoenix Effect', 'Rare animated phoenix that circles your avatar', 'effect', 0, '🔥', '{"animation": "phoenix", "duration": 5, "rarity": "epic"}', true, NOW(), NOW() + INTERVAL '72 hours', 400, 400, 30)
ON CONFLICT DO NOTHING;