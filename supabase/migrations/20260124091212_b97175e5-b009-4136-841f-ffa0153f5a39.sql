-- Create blog_articles table for AfuChat Blog
CREATE TABLE public.blog_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER NOT NULL DEFAULT 1,
  ai_summary TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_blog_articles_slug ON public.blog_articles(slug);
CREATE INDEX idx_blog_articles_published ON public.blog_articles(is_published, published_at DESC);
CREATE INDEX idx_blog_articles_category ON public.blog_articles(category);
CREATE INDEX idx_blog_articles_featured ON public.blog_articles(is_featured, published_at DESC);
CREATE INDEX idx_blog_articles_tags ON public.blog_articles USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Anyone can view published articles" 
ON public.blog_articles 
FOR SELECT 
USING (is_published = true);

-- Only admins can manage articles
CREATE POLICY "Admins can manage all articles" 
ON public.blog_articles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to update reading time based on content
CREATE OR REPLACE FUNCTION public.calculate_reading_time(content TEXT)
RETURNS INTEGER AS $$
DECLARE
  word_count INTEGER;
  words_per_minute INTEGER := 200;
BEGIN
  -- Count words (rough estimate)
  word_count := array_length(regexp_split_to_array(content, '\s+'), 1);
  RETURN GREATEST(1, CEIL(word_count::NUMERIC / words_per_minute));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-update reading time and timestamps
CREATE OR REPLACE FUNCTION public.update_blog_article_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.reading_time_minutes = public.calculate_reading_time(NEW.content);
  
  -- Set published_at when first published
  IF NEW.is_published = true AND OLD.is_published = false THEN
    NEW.published_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_blog_article_metadata_trigger
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_blog_article_metadata();

-- Create trigger for new articles
CREATE OR REPLACE FUNCTION public.set_blog_article_defaults()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reading_time_minutes = public.calculate_reading_time(NEW.content);
  IF NEW.is_published = true AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_blog_article_defaults_trigger
BEFORE INSERT ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.set_blog_article_defaults();

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.blog_articles
  SET views_count = views_count + 1
  WHERE id = article_id AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;