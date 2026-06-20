-- Create developer role enum
DO $$ BEGIN
  CREATE TYPE public.developer_status AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create developer applications table
CREATE TABLE IF NOT EXISTS public.developer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT,
  portfolio_url TEXT,
  experience_level TEXT,
  reason TEXT NOT NULL,
  skills TEXT[],
  status developer_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create developer_roles table for approved developers
CREATE TABLE IF NOT EXISTS public.developer_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  features_enabled TEXT[] DEFAULT ARRAY['api_access', 'beta_features', 'custom_integrations', 'developer_analytics']
);

-- Enable RLS
ALTER TABLE public.developer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_roles ENABLE ROW LEVEL SECURITY;

-- Function to check if user is a developer
CREATE OR REPLACE FUNCTION public.is_developer(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.developer_roles
    WHERE user_id = p_user_id
  )
$$;

-- Function to check if developer has specific feature
CREATE OR REPLACE FUNCTION public.developer_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.developer_roles
    WHERE user_id = p_user_id
    AND p_feature = ANY(features_enabled)
  )
$$;

-- RLS Policies for developer_applications
CREATE POLICY "Users can view their own application"
ON public.developer_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own application"
ON public.developer_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending application"
ON public.developer_applications FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications"
ON public.developer_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
ON public.developer_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for developer_roles
CREATE POLICY "Anyone can check if user is developer"
ON public.developer_roles FOR SELECT
USING (true);

CREATE POLICY "Only admins can grant developer role"
ON public.developer_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can revoke developer role"
ON public.developer_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Function to approve developer application
CREATE OR REPLACE FUNCTION public.approve_developer_application(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Check admin status
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;
  
  -- Get user_id from application
  SELECT user_id INTO v_user_id
  FROM developer_applications
  WHERE id = p_application_id AND status = 'pending';
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Application not found or already processed');
  END IF;
  
  -- Update application status
  UPDATE developer_applications
  SET status = 'approved',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_application_id;
  
  -- Grant developer role
  INSERT INTO developer_roles (user_id, granted_by)
  VALUES (v_user_id, v_admin_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Developer application approved');
END;
$$;

-- Function to reject developer application
CREATE OR REPLACE FUNCTION public.reject_developer_application(p_application_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;
  
  UPDATE developer_applications
  SET status = 'rejected',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = p_application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Application not found or already processed');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Developer application rejected');
END;
$$;