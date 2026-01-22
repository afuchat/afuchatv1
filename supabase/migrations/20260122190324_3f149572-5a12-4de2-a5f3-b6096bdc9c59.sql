-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create mini program orders table
CREATE TABLE public.mini_program_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('event', 'food', 'ride', 'booking', 'flight', 'hotel')),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('MPO-' || upper(substr(md5(random()::text), 1, 8))),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_details JSONB DEFAULT '{}'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  transaction_fee NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.mini_program_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own orders"
ON public.mini_program_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.mini_program_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.mini_program_orders
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_mini_program_orders_user_id ON public.mini_program_orders(user_id);
CREATE INDEX idx_mini_program_orders_status ON public.mini_program_orders(status);
CREATE INDEX idx_mini_program_orders_order_type ON public.mini_program_orders(order_type);

-- Add trigger for updated_at
CREATE TRIGGER update_mini_program_orders_updated_at
BEFORE UPDATE ON public.mini_program_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();