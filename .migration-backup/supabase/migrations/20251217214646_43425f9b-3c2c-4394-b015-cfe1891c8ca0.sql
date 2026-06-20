-- Add acoin_price column to user_product_listings
ALTER TABLE public.user_product_listings
ADD COLUMN acoin_price integer NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_product_listings.acoin_price IS 'Price in ACoin (1 ACoin = $0.2 USD)';