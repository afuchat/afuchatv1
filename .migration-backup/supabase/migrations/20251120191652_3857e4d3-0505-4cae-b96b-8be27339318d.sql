-- Create login_history table to track user login attempts
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  success BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own login history
CREATE POLICY "Users can view own login history"
ON public.login_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create active_sessions table to track user sessions
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL,
  device_name TEXT,
  browser TEXT,
  ip_address TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own active sessions
CREATE POLICY "Users can view own sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON public.active_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own security alerts
CREATE POLICY "Users can view own security alerts"
ON public.security_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own security alerts
CREATE POLICY "Users can update own security alerts"
ON public.security_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON public.login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_read ON public.security_alerts(user_id, is_read);