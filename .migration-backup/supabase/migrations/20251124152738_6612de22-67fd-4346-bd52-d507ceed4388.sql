-- Add gift_id to marketplace_listings to support gift resale
ALTER TABLE marketplace_listings ADD COLUMN gift_id uuid REFERENCES gifts(id);

-- Make shop_item_id and purchase_id nullable since we're supporting gifts now
ALTER TABLE marketplace_listings ALTER COLUMN shop_item_id DROP NOT NULL;
ALTER TABLE marketplace_listings ALTER COLUMN purchase_id DROP NOT NULL;

-- Add constraint to ensure either shop_item_id or gift_id is set (not both, not neither)
ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_item_check 
  CHECK (
    (shop_item_id IS NOT NULL AND gift_id IS NULL) OR 
    (shop_item_id IS NULL AND gift_id IS NOT NULL)
  );

-- Create index for gift listings
CREATE INDEX idx_marketplace_listings_gift_id ON marketplace_listings(gift_id);

-- Update RLS policies to include gift listings
DROP POLICY IF EXISTS "Anyone can view active marketplace listings" ON marketplace_listings;

CREATE POLICY "Anyone can view active marketplace listings"
  ON marketplace_listings
  FOR SELECT
  USING (is_active = true);