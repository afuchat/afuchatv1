-- Allow anyone to view all user gifts (for public profile display)
CREATE POLICY "Anyone can view user gifts"
ON public.user_gifts
FOR SELECT
USING (true);

-- Drop the old restrictive policies that are now redundant
DROP POLICY IF EXISTS "Users can view their own gifts" ON public.user_gifts;
DROP POLICY IF EXISTS "Users can view others' pinned gifts" ON public.user_gifts;