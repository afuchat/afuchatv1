import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAfuAI } from '@/contexts/AfuAIContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowUp, History, Globe, ChevronDown, Sparkles, Plus, Trash2, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import AIMessageContent from '@/components/afuai/AIMessageContent';
import GeneratedImageDisplay from '@/components/afuai/GeneratedImageDisplay';
import { ThinkingDisplay, CollapsibleThinking } from '@/components/afuai/ThinkingDisplay';
import { PostPreviewDialog, PostAction } from '@/components/afuai/PostPreviewDialog';
import { motion, AnimatePresence } from 'framer-motion';
import aiChatIcon from '@/assets/ai-chat-icon.ico';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  timestamp: Date;
  imageUrl?: string;
}

interface Session {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface AIModel {
  id: string;
  name: string;
  icon: string;
  isImageModel?: boolean;
}

const AI_MODELS: AIModel[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: '⚡' },
  { id: 'google/gemini-2.5-flash-image', name: 'Image Gen', icon: '🎨', isImageModel: true },
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', icon: '🧠' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', icon: '💨' },
];

function parsePostAction(content: string): PostAction | null {
  const match = content.match(/\[POST_ACTION\](.*?)\[\/POST_ACTION\]/s);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function cleanPostAction(content: string): string {
  return content.replace(/\[POST_ACTION\].*?\[\/POST_ACTION\]/s, '').trim();
}

const AfuAIModal = () => {
  const { user } = useAuth();
  const { isOpen, closeAfuAI } = useAfuAI();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<string | null>(null);
  const [isThinkingStreaming, setIsThinkingStreaming] = useState(false);
  const [thinkingComplete, setThinkingComplete] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingPostAction, setPendingPostAction] = useState<PostAction | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch profile
  useEffect(() => {
    if (user && isOpen) {
      supabase.from('profiles').select('avatar_url, display_name, handle').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    }
  }, [user, isOpen]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data) setSessions(data);
  }, [user]);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, currentThinking]);

  // Focus textarea when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 300);
  }, [isOpen]);

  const loadSession = async (sessionId: string) => {
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, created_at, attachments')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
      setCurrentSessionId(sessionId);
      setIsHistoryOpen(false);
    }
  };

  const createNewSession = async (): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('ai_chat_sessions')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select().single();
    if (data) {
      setCurrentSessionId(data.id);
      setMessages([]);
      fetchSessions();
      return data.id;
    }
    return null;
  };

  const saveMessage = async (sessionId: string, role: string, content: string) => {
    await supabase.from('ai_chat_messages').insert({ session_id: sessionId, role, content });
    if (role === 'user' && messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await supabase.from('ai_chat_sessions').update({ title, updated_at: new Date().toISOString() }).eq('id', sessionId);
      fetchSessions();
    } else {
      await supabase.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) { toast.error('Failed to create session'); return; }
    }

    const userMessage = input.trim();
    const userMsg: Message = { role: 'user', content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const isImageGen = selectedModel.isImageModel;
    const initialThinking = `User requested: "${userMessage.length > 100 ? userMessage.substring(0, 100) + '...' : userMessage}"`;
    setCurrentThinking(initialThinking);
    setIsThinkingStreaming(true);
    setThinkingComplete(false);

    await saveMessage(sessionId, 'user', userMessage);

    try {
      if (isImageGen) {
        setCurrentThinking(`${initialThinking}\nAnalyzing description for image generation...\nGenerating image with AI...`);
        const { data, error } = await supabase.functions.invoke('generate-ai-image', { body: { prompt: userMessage } });
        if (error) throw error;

        setThinkingComplete(true);
        setIsThinkingStreaming(false);
        await new Promise(r => setTimeout(r, 500));

        const assistantMsg: Message = {
          role: 'assistant',
          content: data?.reply || 'Here\'s the image I generated!',
          imageUrl: data?.images?.[0] || undefined,
          thought: currentThinking || undefined,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setCurrentThinking(null);
        await saveMessage(sessionId, 'assistant', assistantMsg.content);
      } else {
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
          body: { message: userMessage, model: selectedModel.id, webSearchMode, history },
        });

        if (error) {
          // Handle premium requirement
          if (error.message?.includes('Premium required')) {
            toast.error('AfuAI requires Premium subscription');
            setCurrentThinking(null);
            setIsThinkingStreaming(false);
            return;
          }
          throw error;
        }

        if (data) {
          if (data.thought) setCurrentThinking(data.thought);
          setThinkingComplete(true);
          setIsThinkingStreaming(false);
          await new Promise(r => setTimeout(r, 600));

          let replyContent = data.reply;
          const postAction = parsePostAction(replyContent);

          if (postAction) {
            replyContent = cleanPostAction(replyContent);
            if (postAction.auto_publish) {
              // Auto-publish directly
              await createPost(postAction.content);
              replyContent += '\n\n✅ Post published successfully to your feed!';
            } else {
              setPendingPostAction(postAction);
            }
          }

          const assistantMsg: Message = {
            role: 'assistant',
            content: replyContent,
            thought: data.thought,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMsg]);
          setCurrentThinking(null);
          await saveMessage(sessionId, 'assistant', replyContent);
        }
      }
    } catch (e) {
      console.error('AfuAI error:', e);
      toast.error('Failed to get response');
      setCurrentThinking(null);
      setIsThinkingStreaming(false);
    } finally {
      setLoading(false);
      setThinkingComplete(false);
    }
  };

  const createPost = async (content: string) => {
    if (!user) return;
    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      content,
      post_type: 'text',
    });
    if (error) {
      toast.error('Failed to create post');
    } else {
      toast.success('Post published to your feed!');
    }
  };

  const handlePostConfirm = async (content: string) => {
    await createPost(content);
    setPendingPostAction(null);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('ai_chat_messages').delete().eq('session_id', sessionId);
    await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    fetchSessions();
    toast.success('Chat deleted');
  };

  const handleNewChat = async () => {
    await createNewSession();
    setIsHistoryOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - only on mobile */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm"
                onClick={closeAfuAI}
              />
            )}

            {/* Panel */}
            <motion.div
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className={cn(
                "fixed z-[200] flex flex-col bg-card shadow-2xl overflow-hidden",
                isMobile
                  ? "inset-0"
                  : "top-0 right-0 h-full w-[380px] border-l border-border"
              )}
            >
              {/* Header */}
              <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/40 bg-card/95 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <img src={aiChatIcon} alt="AfuAI" className="h-6 w-6 object-contain" />
                  <div className="flex flex-col">
                    <span className="text-sm font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      AfuAI
                    </span>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                      {selectedModel.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} className="h-8 w-8 rounded-full">
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-8 w-8 rounded-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={closeAfuAI} className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"
                style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
              >
                <div className="mx-auto px-3 py-6 max-w-full">
                  {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold">What can I help with?</h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Ask anything, post to your feed, get context on your messages — all from here.
                      </p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex flex-col w-full animate-in slide-in-from-bottom-2 duration-300",
                          msg.role === 'user' ? "items-end" : "items-start"
                        )}
                      >
                        {msg.role === 'assistant' && msg.thought && (
                          <CollapsibleThinking thought={msg.thought} className="mb-3 w-full" />
                        )}
                        <div className={cn(
                          "px-3.5 py-2.5 rounded-2xl shadow-sm max-w-[90%]",
                          msg.role === 'user'
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted/60 border border-border/40 rounded-tl-sm"
                        )}>
                          <AIMessageContent content={msg.content} isUser={msg.role === 'user'} />
                          {msg.imageUrl && (
                            <div className="mt-3">
                              <GeneratedImageDisplay imageUrl={msg.imageUrl} prompt={msg.content} />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-1.5 px-1 uppercase tracking-widest">
                          {format(msg.timestamp, 'HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {loading && currentThinking && (
                    <div className="mt-6 animate-in slide-in-from-bottom-3 duration-300">
                      <ThinkingDisplay
                        thought={currentThinking}
                        isStreaming={isThinkingStreaming}
                        isComplete={thinkingComplete}
                        className="w-full"
                      />
                    </div>
                  )}

                  {loading && thinkingComplete && !currentThinking && (
                    <div className="flex items-start mt-6">
                      <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="h-8" />
                </div>
              </div>

              {/* Input Area */}
              <div className={cn(
                "shrink-0 bg-card border-t border-border/40",
                isMobile ? "p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" : "p-3"
              )}>
                <div className="mx-auto max-w-full">
                  <div className="relative bg-muted/30 border border-border rounded-2xl p-2 focus-within:ring-2 ring-primary/20 transition-all">
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask ${selectedModel.name}...`}
                        className="min-h-[40px] max-h-[120px] flex-1 bg-transparent border-0 focus-visible:ring-0 py-2 px-2 text-[15px] resize-none"
                        rows={1}
                        disabled={loading}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 rounded-full shadow-lg transition-transform active:scale-95"
                        size="icon"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                      </Button>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-background hover:bg-muted transition-colors" disabled={loading}>
                            <span>{selectedModel.icon}</span>
                            <span className={isMobile ? "hidden" : "inline"}>{selectedModel.name}</span>
                            <span className={isMobile ? "inline" : "hidden"}>{selectedModel.name.split(' ')[0]}</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 z-[300]">
                          {AI_MODELS.map((model) => (
                            <DropdownMenuItem
                              key={model.id}
                              onClick={() => setSelectedModel(model)}
                              className={cn("flex items-center gap-2 cursor-pointer", selectedModel.id === model.id && "bg-primary/10 text-primary")}
                            >
                              <span className="text-base">{model.icon}</span>
                              <span className="font-medium">{model.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        onClick={() => setWebSearchMode(!webSearchMode)}
                        disabled={loading}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all",
                          webSearchMode
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Globe className="h-3 w-3" />
                        <span>Web</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Sheet */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent side="left" className={cn("border-r border-border/40 z-[250]", isMobile ? "w-[85%]" : "w-80")}>
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xs font-black uppercase tracking-widest text-primary">Chat History</SheetTitle>
              <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-8 gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="text-xs">New</span>
              </Button>
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="space-y-2 pr-2">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No chat history yet</div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      "p-3 rounded-xl transition-colors cursor-pointer border group",
                      currentSessionId === session.id
                        ? "bg-primary/10 border-primary/30"
                        : "hover:bg-muted border-transparent hover:border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title || 'New Chat'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                          {format(new Date(session.updated_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Post Preview */}
      <PostPreviewDialog
        postAction={pendingPostAction}
        onConfirm={handlePostConfirm}
        onCancel={() => setPendingPostAction(null)}
      />
    </>
  );
};

export default AfuAIModal;
