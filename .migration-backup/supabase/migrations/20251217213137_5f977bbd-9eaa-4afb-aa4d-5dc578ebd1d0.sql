-- Create user product listings table for P2P marketplace
CREATE TABLE public.user_product_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  country TEXT NOT NULL,
  category TEXT,
  images TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_product_listings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view listings from their country
CREATE POLICY "View listings from same country"
ON public.user_product_listings
FOR SELECT
USING (
  country = (SELECT country FROM public.profiles WHERE id = auth.uid())
  OR seller_id = auth.uid()
);

-- Policy: Business accounts can create listings
CREATE POLICY "Business accounts can create listings"
ON public.user_product_listings
FOR INSERT
WITH CHECK (
  seller_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_business_mode = true
  )
);

-- Policy: Sellers can update their own listings
CREATE POLICY "Sellers can update own listings"
ON public.user_product_listings
FOR UPDATE
USING (seller_id = auth.uid());

-- Policy: Sellers can delete their own listings
CREATE POLICY "Sellers can delete own listings"
ON public.user_product_listings
FOR DELETE
USING (seller_id = auth.uid());

-- Create index for country-based queries
CREATE INDEX idx_user_listings_country ON public.user_product_listings(country);
CREATE INDEX idx_user_listings_seller ON public.user_product_listings(seller_id);
CREATE INDEX idx_user_listings_available ON public.user_product_listings(is_available);

-- Add trigger for updated_at
CREATE TRIGGER update_user_listings_updated_at
BEFORE UPDATE ON public.user_product_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_preferences_updated_at();