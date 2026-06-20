-- Allow public read access to groups and channels for search functionality
CREATE POLICY "Anyone can view public groups and channels" 
ON public.chats 
FOR SELECT 
USING (
  (is_group = true OR is_channel = true)
);