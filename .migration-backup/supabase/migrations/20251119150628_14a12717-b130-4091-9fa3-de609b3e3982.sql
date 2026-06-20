-- Create red_envelopes table for group XP sharing
CREATE TABLE public.red_envelopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount INTEGER NOT NULL CHECK (total_amount > 0),
  recipient_count INTEGER NOT NULL CHECK (recipient_count > 0),
  claimed_count INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  envelope_type TEXT NOT NULL DEFAULT 'random' CHECK (envelope_type IN ('random', 'equal')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  is_expired BOOLEAN NOT NULL DEFAULT false
);

-- Create red_envelope_claims table
CREATE TABLE public.red_envelope_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  red_envelope_id UUID NOT NULL REFERENCES public.red_envelopes(id) ON DELETE CASCADE,
  claimer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(red_envelope_id, claimer_id)
);

-- Enable RLS
ALTER TABLE public.red_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_envelope_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for red_envelopes
CREATE POLICY "Anyone can view red envelopes"
ON public.red_envelopes FOR SELECT
USING (true);

CREATE POLICY "Users can create red envelopes"
ON public.red_envelopes FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "System can update red envelopes"
ON public.red_envelopes FOR UPDATE
USING (true);

-- RLS Policies for red_envelope_claims
CREATE POLICY "Anyone can view claims"
ON public.red_envelope_claims FOR SELECT
USING (true);

CREATE POLICY "Users can claim red envelopes"
ON public.red_envelope_claims FOR INSERT
WITH CHECK (auth.uid() = claimer_id);

-- Function to create red envelope
CREATE OR REPLACE FUNCTION public.create_red_envelope(
  p_total_amount INTEGER,
  p_recipient_count INTEGER,
  p_message TEXT DEFAULT NULL,
  p_envelope_type TEXT DEFAULT 'random',
  p_chat_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_xp INTEGER;
  v_envelope_id UUID;
BEGIN
  v_sender_id := auth.uid();
  
  -- Check if sender has enough XP
  SELECT xp INTO v_sender_xp FROM public.profiles WHERE id = v_sender_id;
  
  IF v_sender_xp < p_total_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient XP balance'
    );
  END IF;
  
  -- Deduct XP from sender
  UPDATE public.profiles
  SET xp = xp - p_total_amount
  WHERE id = v_sender_id;
  
  -- Create red envelope
  INSERT INTO public.red_envelopes (
    sender_id,
    total_amount,
    recipient_count,
    message,
    envelope_type,
    expires_at,
    chat_id
  )
  VALUES (
    v_sender_id,
    p_total_amount,
    p_recipient_count,
    p_message,
    p_envelope_type,
    now() + INTERVAL '24 hours',
    p_chat_id
  )
  RETURNING id INTO v_envelope_id;
  
  -- Log activity
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (
    v_sender_id,
    'red_envelope_sent',
    -p_total_amount,
    json_build_object('envelope_id', v_envelope_id, 'recipients', p_recipient_count)
  );
  
  RETURN json_build_object(
    'success', true,
    'envelope_id', v_envelope_id,
    'message', 'Red envelope created successfully'
  );
END;
$$;

-- Function to claim red envelope
CREATE OR REPLACE FUNCTION public.claim_red_envelope(
  p_envelope_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimer_id UUID;
  v_envelope RECORD;
  v_remaining_amount INTEGER;
  v_remaining_count INTEGER;
  v_claim_amount INTEGER;
  v_total_claimed INTEGER;
BEGIN
  v_claimer_id := auth.uid();
  
  -- Get envelope details
  SELECT * INTO v_envelope
  FROM public.red_envelopes
  WHERE id = p_envelope_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Red envelope not found');
  END IF;
  
  -- Check if expired
  IF v_envelope.expires_at < now() OR v_envelope.is_expired THEN
    RETURN json_build_object('success', false, 'message', 'Red envelope has expired');
  END IF;
  
  -- Check if all claimed
  IF v_envelope.claimed_count >= v_envelope.recipient_count THEN
    RETURN json_build_object('success', false, 'message', 'All red envelopes have been claimed');
  END IF;
  
  -- Check if user already claimed
  IF EXISTS (
    SELECT 1 FROM public.red_envelope_claims
    WHERE red_envelope_id = p_envelope_id AND claimer_id = v_claimer_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'You have already claimed this red envelope');
  END IF;
  
  -- Calculate claim amount
  SELECT COALESCE(SUM(amount), 0) INTO v_total_claimed
  FROM public.red_envelope_claims
  WHERE red_envelope_id = p_envelope_id;
  
  v_remaining_amount := v_envelope.total_amount - v_total_claimed;
  v_remaining_count := v_envelope.recipient_count - v_envelope.claimed_count;
  
  IF v_envelope.envelope_type = 'equal' THEN
    -- Equal distribution
    v_claim_amount := v_envelope.total_amount / v_envelope.recipient_count;
  ELSE
    -- Random distribution
    IF v_remaining_count = 1 THEN
      -- Last person gets everything remaining
      v_claim_amount := v_remaining_amount;
    ELSE
      -- Random amount between 1 and (remaining_amount - (remaining_count - 1))
      -- This ensures everyone gets at least 1 XP
      v_claim_amount := 1 + FLOOR(RANDOM() * (v_remaining_amount - v_remaining_count + 1));
    END IF;
  END IF;
  
  -- Ensure amount doesn't exceed remaining
  IF v_claim_amount > v_remaining_amount THEN
    v_claim_amount := v_remaining_amount;
  END IF;
  
  -- Record claim
  INSERT INTO public.red_envelope_claims (red_envelope_id, claimer_id, amount)
  VALUES (p_envelope_id, v_claimer_id, v_claim_amount);
  
  -- Update envelope
  UPDATE public.red_envelopes
  SET 
    claimed_count = claimed_count + 1,
    is_expired = CASE 
      WHEN claimed_count + 1 >= recipient_count THEN true 
      ELSE false 
    END
  WHERE id = p_envelope_id;
  
  -- Add XP to claimer
  UPDATE public.profiles
  SET xp = xp + v_claim_amount
  WHERE id = v_claimer_id;
  
  -- Log activity
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (
    v_claimer_id,
    'red_envelope_claimed',
    v_claim_amount,
    json_build_object('envelope_id', p_envelope_id, 'sender_id', v_envelope.sender_id)
  );
  
  RETURN json_build_object(
    'success', true,
    'amount', v_claim_amount,
    'message', 'Red envelope claimed successfully!',
    'is_last', (v_envelope.claimed_count + 1) >= v_envelope.recipient_count
  );
END;
$$;

-- Create indexes
CREATE INDEX idx_red_envelopes_sender ON public.red_envelopes(sender_id);
CREATE INDEX idx_red_envelopes_chat ON public.red_envelopes(chat_id);
CREATE INDEX idx_red_envelopes_expires ON public.red_envelopes(expires_at);
CREATE INDEX idx_red_envelope_claims_envelope ON public.red_envelope_claims(red_envelope_id);
CREATE INDEX idx_red_envelope_claims_claimer ON public.red_envelope_claims(claimer_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.red_envelopes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.red_envelope_claims;