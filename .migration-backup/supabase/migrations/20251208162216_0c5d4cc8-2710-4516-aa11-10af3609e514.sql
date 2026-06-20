-- Create function to check if user has active premium subscription
CREATE OR REPLACE FUNCTION public.is_premium_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = p_user_id
      AND is_active = true
      AND expires_at > now()
  );
$$;

-- Create function to check daily claim limit for non-premium users
CREATE OR REPLACE FUNCTION public.can_claim_red_envelope(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Premium users have no limit
      WHEN public.is_premium_user(p_user_id) THEN true
      -- Non-premium users: check if they've claimed today
      ELSE NOT EXISTS (
        SELECT 1
        FROM public.red_envelope_claims
        WHERE claimer_id = p_user_id
          AND claimed_at >= CURRENT_DATE
          AND claimed_at < CURRENT_DATE + INTERVAL '1 day'
      )
    END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create red envelopes" ON public.red_envelopes;
DROP POLICY IF EXISTS "Users can claim red envelopes" ON public.red_envelope_claims;

-- Only premium users can create red envelopes
CREATE POLICY "Premium users can create red envelopes"
ON public.red_envelopes
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_premium_user(auth.uid())
);

-- All users can claim, but non-premium have daily limit (enforced via function)
CREATE POLICY "Users can claim red envelopes with limits"
ON public.red_envelope_claims
FOR INSERT
WITH CHECK (
  auth.uid() = claimer_id 
  AND public.can_claim_red_envelope(auth.uid())
);