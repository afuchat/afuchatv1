-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (text-only, no media)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  bio TEXT CHECK (char_length(bio) <= 150),
  is_private BOOLEAN DEFAULT false,
  show_online_status BOOLEAN DEFAULT true,
  show_read_receipts BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chats table (1:1 and group chats)
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT, -- Only for group chats
  is_group BOOLEAN DEFAULT false,
  member_limit INTEGER DEFAULT 50,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat members
CREATE TABLE public.chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(chat_id, user_id)
);

-- Messages table (text-only, E2E encrypted)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL, -- E2E encrypted message content
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Message status tracking
CREATE TABLE public.message_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  UNIQUE(message_id, user_id)
);

-- Feed posts table (280 char limit)
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Post replies (threaded comments)
CREATE TABLE public.post_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Post acknowledgments (likes)
CREATE TABLE public.post_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Following/followers for feed
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Typing indicators
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for chats
CREATE POLICY "Users can view chats they are members of"
  ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = chats.id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update group chats"
  ON public.chats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = chats.id
      AND chat_members.user_id = auth.uid()
      AND chat_members.is_admin = true
    )
  );

-- RLS Policies for chat_members
CREATE POLICY "Users can view members of their chats"
  ON public.chat_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_members.chat_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join chats"
  ON public.chat_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage members"
  ON public.chat_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.chat_id = chat_members.chat_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = true
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = auth.uid()
    )
  );

-- RLS Policies for message_status
CREATE POLICY "Users can view status for their messages"
  ON public.message_status FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_status.message_id
      AND messages.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own message status"
  ON public.message_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their message status"
  ON public.message_status FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for posts
CREATE POLICY "Users can view public posts or posts from followed users"
  ON public.posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = posts.author_id
      AND (
        profiles.is_private = false OR
        EXISTS (
          SELECT 1 FROM public.follows
          WHERE follows.following_id = posts.author_id
          AND follows.follower_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for post_replies
CREATE POLICY "Users can view replies on visible posts"
  ON public.post_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_replies.post_id
    )
  );

CREATE POLICY "Users can create replies"
  ON public.post_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- RLS Policies for post_acknowledgments
CREATE POLICY "Users can view acknowledgments"
  ON public.post_acknowledgments FOR SELECT
  USING (true);

CREATE POLICY "Users can create acknowledgments"
  ON public.post_acknowledgments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their acknowledgments"
  ON public.post_acknowledgments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Users can view follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing in their chats"
  ON public.typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = typing_indicators.chat_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their typing status"
  ON public.typing_indicators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can clear their typing status"
  ON public.typing_indicators FOR DELETE
  USING (auth.uid() = user_id);

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substring(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;