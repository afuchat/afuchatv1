-- Create verification requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('business', 'influencer')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website_url TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  verification_reason TEXT NOT NULL,
  supporting_documents TEXT[], -- Array of URLs to uploaded documents
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own verification requests
CREATE POLICY "Users can create their own verification requests"
ON public.verification_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own verification requests
CREATE POLICY "Users can view their own verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all verification requests
CREATE POLICY "Admins can view all verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update verification requests
CREATE POLICY "Admins can update verification requests"
ON public.verification_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);

-- Create trigger to update updated_at
CREATE TRIGGER update_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();