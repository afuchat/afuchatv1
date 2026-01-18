-- Create AI chat sessions table for persistent chat history
CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI chat messages table
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI memories table for long-term context
CREATE TABLE public.ai_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'fact', 'context', 'summary')),
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_chat_sessions
CREATE POLICY "Users can view their own chat sessions"
  ON public.ai_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
  ON public.ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON public.ai_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON public.ai_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_chat_messages
CREATE POLICY "Users can view messages from their sessions"
  ON public.ai_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions 
    WHERE id = ai_chat_messages.session_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their sessions"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions 
    WHERE id = ai_chat_messages.session_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages from their sessions"
  ON public.ai_chat_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions 
    WHERE id = ai_chat_messages.session_id 
    AND user_id = auth.uid()
  ));

-- RLS Policies for ai_memories
CREATE POLICY "Users can view their own memories"
  ON public.ai_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage memories"
  ON public.ai_memories FOR ALL
  USING (true);

-- Create indexes
CREATE INDEX idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_sessions_updated_at ON public.ai_chat_sessions(updated_at DESC);
CREATE INDEX idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);
CREATE INDEX idx_ai_chat_messages_created_at ON public.ai_chat_messages(created_at);
CREATE INDEX idx_ai_memories_user_id ON public.ai_memories(user_id);
CREATE INDEX idx_ai_memories_expires_at ON public.ai_memories(expires_at);

-- Trigger for updating session updated_at
CREATE OR REPLACE FUNCTION update_ai_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_chat_sessions 
  SET updated_at = now() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_session_timestamp
  AFTER INSERT ON public.ai_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_session_updated_at();