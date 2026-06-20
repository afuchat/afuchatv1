-- Update RLS policies for verification_requests to allow admins to update and view all requests

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Admins can update verification requests" ON verification_requests;

-- Allow admins to view all verification requests
CREATE POLICY "Admins can view all verification requests"
ON verification_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update verification requests
CREATE POLICY "Admins can update verification requests"
ON verification_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update profile verification status
DROP POLICY IF EXISTS "Admins can update profile verification status" ON profiles;

CREATE POLICY "Admins can update profile verification status"
ON profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));