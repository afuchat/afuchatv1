-- Alias emails table for AfuMail
CREATE TABLE public.afumail_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias_email text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  is_plus_address boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alias_email)
);

-- Index for fast lookup during inbound routing
CREATE INDEX idx_afumail_aliases_email ON public.afumail_aliases(alias_email) WHERE is_active = true;
CREATE INDEX idx_afumail_aliases_user ON public.afumail_aliases(user_id);

-- Enable RLS
ALTER TABLE public.afumail_aliases ENABLE ROW LEVEL SECURITY;

-- Users can manage their own aliases
CREATE POLICY "Users can view own aliases"
  ON public.afumail_aliases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own aliases"
  ON public.afumail_aliases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own aliases"
  ON public.afumail_aliases FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own aliases"
  ON public.afumail_aliases FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to resolve an email address to a user_id (checks mailboxes, aliases, plus-addressing)
CREATE OR REPLACE FUNCTION public.resolve_afumail_recipient(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_base_email text;
  v_plus_pos int;
BEGIN
  -- 1. Check direct mailbox match
  SELECT user_id INTO v_user_id
    FROM afumail_mailboxes
    WHERE email_address = lower(p_email);
  IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;

  -- 2. Check alias match
  SELECT user_id INTO v_user_id
    FROM afumail_aliases
    WHERE alias_email = lower(p_email) AND is_active = true;
  IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;

  -- 3. Check plus-addressing: user+tag@afuchat.com -> user@afuchat.com
  IF p_email LIKE '%+%@afuchat.com' THEN
    v_plus_pos := position('+' in p_email);
    v_base_email := substring(p_email from 1 for v_plus_pos - 1) || '@afuchat.com';
    
    SELECT user_id INTO v_user_id
      FROM afumail_mailboxes
      WHERE email_address = lower(v_base_email);
    IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;
  END IF;

  -- 4. Legacy fallback: check profiles by handle
  IF p_email LIKE '%@afuchat.com' THEN
    SELECT id INTO v_user_id
      FROM profiles
      WHERE handle = lower(replace(split_part(p_email, '@', 1), '+', ''));
    IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;
  END IF;

  RETURN NULL;
END;
$$;