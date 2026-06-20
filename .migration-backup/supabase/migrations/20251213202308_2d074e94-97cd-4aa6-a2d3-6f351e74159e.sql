-- Update ShopShach profile to ShopShack
UPDATE public.profiles 
SET 
  display_name = 'ShopShack',
  handle = 'shopshack'
WHERE id = '629333cf-087e-4283-8a09-a44282dda98b';

-- Update merchant name
UPDATE public.merchants
SET name = 'ShopShack'
WHERE user_id = '629333cf-087e-4283-8a09-a44282dda98b';

-- Create system notification chat type column if not exists
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_system_notifications BOOLEAN DEFAULT false;

-- Create order support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.merchant_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" 
ON public.support_tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets" 
ON public.support_tickets FOR UPDATE 
USING (auth.uid() = user_id);