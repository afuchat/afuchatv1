
-- AfuMail: Internal email service with real @afuchat.com addresses

-- Mailboxes table (one per user)
CREATE TABLE public.afumail_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.afumail_mailboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mailbox"
  ON public.afumail_mailboxes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mailbox"
  ON public.afumail_mailboxes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Emails table
CREATE TABLE public.afumail_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  body_html text,
  has_attachments boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.afumail_emails ENABLE ROW LEVEL SECURITY;

-- Recipients table (to, cc, bcc)
CREATE TABLE public.afumail_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES public.afumail_emails(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_type text NOT NULL DEFAULT 'to' CHECK (recipient_type IN ('to', 'cc', 'bcc')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.afumail_recipients ENABLE ROW LEVEL SECURITY;

-- User email state (folder, read, starred, trashed per user per email)
CREATE TABLE public.afumail_user_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_id uuid REFERENCES public.afumail_emails(id) ON DELETE CASCADE NOT NULL,
  folder text NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'archive', 'starred')),
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  is_trashed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, email_id)
);

ALTER TABLE public.afumail_user_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email state"
  ON public.afumail_user_emails FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email state"
  ON public.afumail_user_emails FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email state"
  ON public.afumail_user_emails FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own email state"
  ON public.afumail_user_emails FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Email RLS: can read if you're sender or recipient
CREATE POLICY "Users can read emails they sent or received"
  ON public.afumail_emails FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR id IN (SELECT email_id FROM public.afumail_user_emails WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert emails"
  ON public.afumail_emails FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own drafts"
  ON public.afumail_emails FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() AND is_draft = true)
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete own drafts"
  ON public.afumail_emails FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() AND is_draft = true);

-- Recipients RLS
CREATE POLICY "Users can read recipients for their emails"
  ON public.afumail_recipients FOR SELECT
  TO authenticated
  USING (
    email_id IN (SELECT email_id FROM public.afumail_user_emails WHERE user_id = auth.uid())
    OR email_id IN (SELECT id FROM public.afumail_emails WHERE sender_id = auth.uid())
  );

CREATE POLICY "Users can insert recipients for their emails"
  ON public.afumail_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    email_id IN (SELECT id FROM public.afumail_emails WHERE sender_id = auth.uid())
  );

-- Attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('afumail-attachments', 'afumail-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments
CREATE POLICY "Users can upload afumail attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'afumail-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own afumail attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'afumail-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Index for performance
CREATE INDEX idx_afumail_user_emails_user ON public.afumail_user_emails(user_id, folder);
CREATE INDEX idx_afumail_user_emails_email ON public.afumail_user_emails(email_id);
CREATE INDEX idx_afumail_recipients_email ON public.afumail_recipients(email_id);
CREATE INDEX idx_afumail_emails_sender ON public.afumail_emails(sender_id);

-- Function to auto-create mailbox on first access
CREATE OR REPLACE FUNCTION public.get_or_create_mailbox(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_handle text;
BEGIN
  -- Check if mailbox exists
  SELECT email_address INTO v_email FROM afumail_mailboxes WHERE user_id = p_user_id;
  IF v_email IS NOT NULL THEN
    RETURN v_email;
  END IF;

  -- Get user handle
  SELECT handle INTO v_handle FROM profiles WHERE id = p_user_id;
  IF v_handle IS NULL THEN
    v_handle := replace(p_user_id::text, '-', '');
  END IF;

  v_email := v_handle || '@afuchat.com';

  -- Insert mailbox
  INSERT INTO afumail_mailboxes (user_id, email_address)
  VALUES (p_user_id, v_email)
  ON CONFLICT (user_id) DO UPDATE SET email_address = EXCLUDED.email_address
  RETURNING email_address INTO v_email;

  RETURN v_email;
END;
$$;
