-- Create stories/moments table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Anyone can view non-expired stories"
ON public.stories FOR SELECT
USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
ON public.stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.stories FOR DELETE
USING (auth.uid() = user_id);

-- Create story views table
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story views
CREATE POLICY "Story owners can view who viewed their stories"
ON public.story_views FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.stories
  WHERE stories.id = story_views.story_id
  AND stories.user_id = auth.uid()
));

CREATE POLICY "Users can insert story views"
ON public.story_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- Create mini_programs table
CREATE TABLE public.mini_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  developer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  install_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mini_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mini_programs
CREATE POLICY "Anyone can view published mini programs"
ON public.mini_programs FOR SELECT
USING (is_published = true);

CREATE POLICY "Developers can manage their own mini programs"
ON public.mini_programs FOR ALL
USING (auth.uid() = developer_id)
WITH CHECK (auth.uid() = developer_id);

-- Create user_mini_programs (installed apps)
CREATE TABLE public.user_mini_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mini_program_id UUID NOT NULL REFERENCES public.mini_programs(id) ON DELETE CASCADE,
  installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, mini_program_id)
);

-- Enable RLS
ALTER TABLE public.user_mini_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their installed mini programs"
ON public.user_mini_programs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can install mini programs"
ON public.user_mini_programs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can uninstall mini programs"
ON public.user_mini_programs FOR DELETE
USING (auth.uid() = user_id);

-- Create xp_transfers table
CREATE TABLE public.xp_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.xp_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xp_transfers
CREATE POLICY "Users can view their own transfers"
ON public.xp_transfers FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create transfers"
ON public.xp_transfers FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create function to process XP transfer
CREATE OR REPLACE FUNCTION public.process_xp_transfer(
  p_receiver_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_xp INTEGER;
  v_transfer_id UUID;
BEGIN
  v_sender_id := auth.uid();
  
  -- Check if sender has enough XP
  SELECT xp INTO v_sender_xp FROM public.profiles WHERE id = v_sender_id;
  
  IF v_sender_xp < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient XP balance'
    );
  END IF;
  
  -- Deduct XP from sender
  UPDATE public.profiles
  SET xp = xp - p_amount
  WHERE id = v_sender_id;
  
  -- Add XP to receiver
  UPDATE public.profiles
  SET xp = xp + p_amount
  WHERE id = p_receiver_id;
  
  -- Record transfer
  INSERT INTO public.xp_transfers (sender_id, receiver_id, amount, message)
  VALUES (v_sender_id, p_receiver_id, p_amount, p_message)
  RETURNING id INTO v_transfer_id;
  
  RETURN json_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'message', 'Transfer completed successfully'
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX idx_mini_programs_category ON public.mini_programs(category);
CREATE INDEX idx_xp_transfers_sender ON public.xp_transfers(sender_id);
CREATE INDEX idx_xp_transfers_receiver ON public.xp_transfers(receiver_id);

-- Enable realtime for stories
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;