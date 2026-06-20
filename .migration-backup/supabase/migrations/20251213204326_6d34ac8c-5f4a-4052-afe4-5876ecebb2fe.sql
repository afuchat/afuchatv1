-- Drop the support_tickets table as we're moving to consolidated chats
DROP TABLE IF EXISTS public.support_tickets;

-- Add order_context column to messages for order-related messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS order_context jsonb DEFAULT NULL;

-- Create a table to track customer-merchant chat relationships
CREATE TABLE IF NOT EXISTS public.merchant_customer_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(merchant_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.merchant_customer_chats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own merchant chats" ON public.merchant_customer_chats
FOR SELECT USING (auth.uid() = customer_id OR EXISTS (
  SELECT 1 FROM public.merchants WHERE id = merchant_customer_chats.merchant_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create merchant customer chats" ON public.merchant_customer_chats
FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Create the ShopShack admin notifications chat (visible only to ShopShack)
INSERT INTO public.chats (id, name, is_channel, is_system_notifications, description, created_by, avatar_url)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'AfuChat Order Notifications',
  true,
  true,
  'All order notifications, cancellations, and refund requests',
  '629333cf-087e-4283-8a09-a44282dda98b',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Add ShopShack as admin member
INSERT INTO public.chat_members (chat_id, user_id, is_admin)
VALUES ('a0000000-0000-0000-0000-000000000001', '629333cf-087e-4283-8a09-a44282dda98b', true)
ON CONFLICT DO NOTHING;