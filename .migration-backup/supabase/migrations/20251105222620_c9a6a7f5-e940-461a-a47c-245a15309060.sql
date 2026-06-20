-- Fix push_subscriptions RLS policies
-- Allow users to manage their own push notification subscriptions

-- Allow users to insert their own push subscriptions
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own push subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own push subscriptions
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);