-- Add last_sale_price to gift_statistics for dynamic pricing
ALTER TABLE gift_statistics
ADD COLUMN IF NOT EXISTS last_sale_price integer DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN gift_statistics.last_sale_price IS 'The price of the last sale for this gift, used for dynamic marketplace pricing';