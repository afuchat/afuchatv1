-- Create user_gifts table to track owned collectibles
CREATE TABLE public.user_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.gift_transactions(id) ON DELETE SET NULL,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_pinned BOOLEAN DEFAULT false,
  pin_order INTEGER DEFAULT NULL
);

-- Create index for faster lookups
CREATE INDEX idx_user_gifts_user_id ON public.user_gifts(user_id);
CREATE INDEX idx_user_gifts_gift_id ON public.user_gifts(gift_id);

-- Enable RLS
ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own gifts"
  ON public.user_gifts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others' pinned gifts"
  ON public.user_gifts FOR SELECT
  USING (is_pinned = true);

CREATE POLICY "System can insert gifts"
  ON public.user_gifts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own gifts"
  ON public.user_gifts FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to add gift to receiver's inventory when a gift is sent
CREATE OR REPLACE FUNCTION public.add_gift_to_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add the gift to the receiver's inventory
  INSERT INTO public.user_gifts (user_id, gift_id, transaction_id)
  VALUES (NEW.receiver_id, NEW.gift_id, NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically add gift to inventory on transaction
CREATE TRIGGER on_gift_transaction_add_to_inventory
  AFTER INSERT ON public.gift_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_gift_to_inventory();