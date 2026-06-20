-- Create unified mini_program_listings table for user-submitted content
CREATE TABLE public.mini_program_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('event', 'booking', 'ride', 'food', 'travel_flight', 'travel_hotel')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price TEXT,
  currency TEXT DEFAULT 'Nexa',
  location TEXT,
  country TEXT,
  category TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mini_program_listings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved listings"
ON public.mini_program_listings
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Users can view their own listings"
ON public.mini_program_listings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own listings"
ON public.mini_program_listings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
ON public.mini_program_listings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
ON public.mini_program_listings
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_mini_program_listings_type ON public.mini_program_listings(listing_type);
CREATE INDEX idx_mini_program_listings_country ON public.mini_program_listings(country);
CREATE INDEX idx_mini_program_listings_status ON public.mini_program_listings(status);