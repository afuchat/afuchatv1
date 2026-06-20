-- Add unique constraint on user_id for user_subscriptions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_subscriptions_user_id_key' 
    AND conrelid = 'public.user_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;