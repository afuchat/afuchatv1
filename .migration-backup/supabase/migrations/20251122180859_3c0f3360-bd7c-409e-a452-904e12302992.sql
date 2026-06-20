-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock
CREATE POLICY "Users can unblock"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create index for performance
CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = p_blocker_id
      AND blocked_id = p_blocked_id
  );
$$;