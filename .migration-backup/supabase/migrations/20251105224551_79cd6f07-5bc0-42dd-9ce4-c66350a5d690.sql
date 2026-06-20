-- Update the trigger function to prevent AfuAI from replying to itself
CREATE OR REPLACE FUNCTION handle_afuai_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_post_content TEXT;
  v_afuai_user_id UUID;
  v_author_handle TEXT;
  v_response_id BIGINT;
BEGIN
  -- Get the author's handle to check if it's AfuAI itself
  SELECT handle INTO v_author_handle
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Don't trigger if AfuAI is replying to itself
  IF v_author_handle = 'afuai' THEN
    RETURN NEW;
  END IF;
  
  -- Check if the reply contains @afuai or @AfuAI (case insensitive)
  IF NEW.content ~* '@afuai' THEN
    -- Get the original post content
    SELECT content INTO v_post_content
    FROM posts
    WHERE id = NEW.post_id;
    
    -- Get AfuAI user id
    SELECT id INTO v_afuai_user_id
    FROM profiles
    WHERE handle = 'afuai';
    
    -- If AfuAI user doesn't exist, create it
    IF v_afuai_user_id IS NULL THEN
      INSERT INTO profiles (display_name, handle, bio, is_verified)
      VALUES ('AfuAI', 'afuai', '🤖 AI Assistant for AfuChat - Here to help!', true)
      RETURNING id INTO v_afuai_user_id;
    END IF;
    
    -- Make async HTTP request to the edge function
    SELECT net.http_post(
      url := 'https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/afu-ai-reply',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnNqcXF0ZHpsa3ZxYXpmY2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzA4NjksImV4cCI6MjA3NzI0Njg2OX0.j8zuszO1K6Apjn-jRiVUyZeqe3Re424xyOho9qDl_oY'
      ),
      body := jsonb_build_object(
        'postId', NEW.post_id,
        'replyContent', NEW.content,
        'originalPostContent', v_post_content,
        'triggerReplyId', NEW.id
      )
    ) INTO v_response_id;
    
    RAISE NOTICE 'AfuAI mention detected in reply %. HTTP request initiated with response_id: %', NEW.id, v_response_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the post mention handler similarly
CREATE OR REPLACE FUNCTION handle_afuai_mention_in_post()
RETURNS TRIGGER AS $$
DECLARE
  v_afuai_user_id UUID;
  v_author_handle TEXT;
  v_response_id BIGINT;
BEGIN
  -- Get the author's handle
  SELECT handle INTO v_author_handle
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Don't trigger if AfuAI is posting
  IF v_author_handle = 'afuai' THEN
    RETURN NEW;
  END IF;
  
  -- Check if the post contains @afuai or @AfuAI (case insensitive)
  IF NEW.content ~* '@afuai' THEN
    -- Get AfuAI user id
    SELECT id INTO v_afuai_user_id
    FROM profiles
    WHERE handle = 'afuai';
    
    -- If AfuAI user doesn't exist, create it
    IF v_afuai_user_id IS NULL THEN
      INSERT INTO profiles (display_name, handle, bio, is_verified)
      VALUES ('AfuAI', 'afuai', '🤖 AI Assistant for AfuChat - Here to help!', true)
      RETURNING id INTO v_afuai_user_id;
    END IF;
    
    -- Make async HTTP request to the edge function for posts
    SELECT net.http_post(
      url := 'https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/afu-ai-reply',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnNqcXF0ZHpsa3ZxYXpmY2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzA4NjksImV4cCI6MjA3NzI0Njg2OX0.j8zuszO1K6Apjn-jRiVUyZeqe3Re424xyOho9qDl_oY'
      ),
      body := jsonb_build_object(
        'postId', NEW.id,
        'replyContent', NEW.content,
        'originalPostContent', NEW.content
      )
    ) INTO v_response_id;
    
    RAISE NOTICE 'AfuAI mention detected in post %. HTTP request initiated with response_id: %', NEW.id, v_response_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;