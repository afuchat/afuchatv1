-- Add chat_id to gift_transactions to track gifts sent in chat
ALTER TABLE public.gift_transactions
ADD COLUMN chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL;

-- Create index for efficient querying of chat gifts
CREATE INDEX idx_gift_transactions_chat_id ON public.gift_transactions(chat_id) WHERE chat_id IS NOT NULL;