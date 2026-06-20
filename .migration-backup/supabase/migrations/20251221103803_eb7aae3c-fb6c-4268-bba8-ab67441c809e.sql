-- Create table for secure Telegram account linking verification codes
CREATE TABLE public.telegram_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 0 NOT NULL
);

-- Enable RLS
ALTER TABLE public.telegram_verification_codes ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own verification codes
CREATE POLICY "Users can view their own verification codes"
ON public.telegram_verification_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_telegram_verification_codes_code ON public.telegram_verification_codes(verification_code);
CREATE INDEX idx_telegram_verification_codes_chat_id ON public.telegram_verification_codes(telegram_chat_id);
CREATE INDEX idx_telegram_verification_codes_expires ON public.telegram_verification_codes(expires_at);

-- Function to generate a secure 6-digit verification code
CREATE OR REPLACE FUNCTION public.generate_telegram_verification_code(
    p_user_id UUID,
    p_telegram_chat_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Delete any existing unverified codes for this telegram chat
    DELETE FROM public.telegram_verification_codes 
    WHERE telegram_chat_id = p_telegram_chat_id 
    AND verified_at IS NULL;
    
    -- Generate a random 6-digit code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Insert the new verification code (expires in 10 minutes)
    INSERT INTO public.telegram_verification_codes (
        user_id,
        telegram_chat_id,
        verification_code,
        expires_at
    ) VALUES (
        p_user_id,
        p_telegram_chat_id,
        v_code,
        now() + INTERVAL '10 minutes'
    );
    
    RETURN v_code;
END;
$$;

-- Function to verify and link telegram account
CREATE OR REPLACE FUNCTION public.verify_telegram_link(
    p_telegram_chat_id TEXT,
    p_verification_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
    v_result JSON;
BEGIN
    -- Find the verification code
    SELECT * INTO v_record
    FROM public.telegram_verification_codes
    WHERE telegram_chat_id = p_telegram_chat_id
    AND verification_code = p_verification_code
    AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if code exists
    IF v_record IS NULL THEN
        -- Increment attempts for this chat's latest code
        UPDATE public.telegram_verification_codes
        SET attempts = attempts + 1
        WHERE telegram_chat_id = p_telegram_chat_id
        AND verified_at IS NULL;
        
        RETURN json_build_object('success', false, 'error', 'Invalid verification code');
    END IF;
    
    -- Check if code expired
    IF v_record.expires_at < now() THEN
        RETURN json_build_object('success', false, 'error', 'Verification code has expired. Please request a new one.');
    END IF;
    
    -- Check max attempts (max 5)
    IF v_record.attempts >= 5 THEN
        RETURN json_build_object('success', false, 'error', 'Too many failed attempts. Please request a new code.');
    END IF;
    
    -- Mark as verified
    UPDATE public.telegram_verification_codes
    SET verified_at = now()
    WHERE id = v_record.id;
    
    -- Update or insert telegram_users record
    INSERT INTO public.telegram_users (user_id, telegram_chat_id, telegram_username)
    VALUES (v_record.user_id, p_telegram_chat_id, NULL)
    ON CONFLICT (telegram_chat_id) 
    DO UPDATE SET user_id = v_record.user_id, linked_at = now();
    
    RETURN json_build_object('success', true, 'user_id', v_record.user_id);
END;
$$;

-- Clean up expired verification codes (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.telegram_verification_codes
    WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;