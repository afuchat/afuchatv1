-- Remove existing shop item listings
DELETE FROM marketplace_listings WHERE gift_id IS NULL;

-- Remove shop item and purchase references from marketplace
ALTER TABLE marketplace_listings 
  DROP COLUMN IF EXISTS shop_item_id,
  DROP COLUMN IF EXISTS purchase_id,
  DROP CONSTRAINT IF EXISTS marketplace_listings_gift_or_shop_item;

-- Ensure gift_id is required
ALTER TABLE marketplace_listings 
  ALTER COLUMN gift_id SET NOT NULL;