-- Drop shop-related tables and their dependencies
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS user_shop_purchases CASCADE;
DROP TABLE IF EXISTS shop_items CASCADE;

-- Drop functions with specific signatures
DROP FUNCTION IF EXISTS purchase_shop_item(uuid) CASCADE;
DROP FUNCTION IF EXISTS place_bid(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS finalize_auction(uuid) CASCADE;
DROP FUNCTION IF EXISTS create_marketplace_listing(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS purchase_marketplace_item(uuid) CASCADE;