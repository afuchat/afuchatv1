
-- Music tracks library
CREATE TABLE public.music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT DEFAULT 'Unknown',
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 6,
  genre TEXT DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view music tracks"
  ON public.music_tracks FOR SELECT
  USING (true);

-- Music shorts (the actual created shorts)
CREATE TABLE public.music_shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text_content TEXT NOT NULL CHECK (char_length(text_content) <= 120),
  music_track_id UUID REFERENCES public.music_tracks(id) ON DELETE SET NULL,
  background_style TEXT DEFAULT 'gradient' CHECK (background_style IN ('gradient', 'particles', 'solid', 'image', 'news')),
  background_config JSONB DEFAULT '{}',
  text_color TEXT DEFAULT '#FFFFFF',
  font_style TEXT DEFAULT 'bold',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.music_shorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view music shorts"
  ON public.music_shorts FOR SELECT
  USING (true);

CREATE POLICY "Auth users can create music shorts"
  ON public.music_shorts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own music shorts"
  ON public.music_shorts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own music shorts"
  ON public.music_shorts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Music short likes
CREATE TABLE public.music_short_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID REFERENCES public.music_shorts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(short_id, user_id)
);

ALTER TABLE public.music_short_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.music_short_likes FOR SELECT
  USING (true);

CREATE POLICY "Auth users can like"
  ON public.music_short_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.music_short_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Music short comments
CREATE TABLE public.music_short_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID REFERENCES public.music_shorts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.music_short_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.music_short_comments FOR SELECT
  USING (true);

CREATE POLICY "Auth users can comment"
  ON public.music_short_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.music_short_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_music_shorts_user ON public.music_shorts(user_id);
CREATE INDEX idx_music_shorts_track ON public.music_shorts(music_track_id);
CREATE INDEX idx_music_shorts_created ON public.music_shorts(created_at DESC);
CREATE INDEX idx_music_short_likes_short ON public.music_short_likes(short_id);
CREATE INDEX idx_music_short_comments_short ON public.music_short_comments(short_id);
CREATE INDEX idx_music_tracks_usage ON public.music_tracks(usage_count DESC);

-- Function to increment usage count when a short is created
CREATE OR REPLACE FUNCTION public.increment_track_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.music_tracks SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = NEW.music_track_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_music_short_created
  AFTER INSERT ON public.music_shorts
  FOR EACH ROW
  WHEN (NEW.music_track_id IS NOT NULL)
  EXECUTE FUNCTION public.increment_track_usage();

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_short_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_shorts SET likes_count = likes_count + 1 WHERE id = NEW.short_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_shorts SET likes_count = likes_count - 1 WHERE id = OLD.short_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_short_like_change
  AFTER INSERT OR DELETE ON public.music_short_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_short_likes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION public.update_short_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_shorts SET comments_count = comments_count + 1 WHERE id = NEW.short_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_shorts SET comments_count = comments_count - 1 WHERE id = OLD.short_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_short_comment_change
  AFTER INSERT OR DELETE ON public.music_short_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_short_comments_count();

-- Seed some sample music tracks
INSERT INTO public.music_tracks (title, artist, audio_url, duration_seconds, genre, is_featured) VALUES
  ('Chill Vibes', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 6, 'chill', true),
  ('Urban Flow', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 6, 'hip-hop', true),
  ('Sunset Dreams', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 6, 'ambient', true),
  ('Electric Pulse', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 6, 'electronic', true),
  ('Morning Jazz', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 6, 'jazz', false),
  ('Afro Rhythm', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 6, 'afrobeat', true),
  ('Lo-fi Study', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', 6, 'lo-fi', false),
  ('Dance Floor', 'AfuBeats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 6, 'dance', true);
