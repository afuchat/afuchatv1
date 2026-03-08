import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAfuAI } from '@/contexts/AfuAIContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowUp, History, Globe, ChevronDown, Sparkles, Plus, Trash2, X, Loader2, ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  comingSoon?: boolean;
}

const AI_MODELS_DESKTOP: AIModel[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: '⚡' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', icon: '🧠' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', icon: '💨' },
];

const AI_MODELS_MOBILE: AIModel[] = [
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

const AfuAIModal = ({ isPage = false }: { isPage?: boolean }) => {
  const { user } = useAuth();
  const { isOpen, closeAfuAI } = useAfuAI();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<string | null>(null);
  const [isThinkingStreaming, setIsThinkingStreaming] = useState(false);
  const [thinkingComplete, setThinkingComplete] = useState(false);
  const aiModels = isMobile ? AI_MODELS_MOBILE : AI_MODELS_DESKTOP;
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS_DESKTOP[0]);
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

  const AI_WATERMARK = '\n\n✦ Generated with AfuAI';

  const createPost = async (content: string) => {
    if (!user) return;
    const watermarkedContent = content.trim() + AI_WATERMARK;
    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      content: watermarkedContent,
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
                "fixed z-[200] flex flex-col overflow-hidden",
                isMobile
                  ? "inset-0 bg-background"
                  : "top-0 right-0 h-full w-[400px] bg-background border-l border-border shadow-2xl"
              )}
            >
              {/* Header */}
              <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border bg-background">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                      <img src={aiChatIcon} alt="AfuAI" className="h-4.5 w-4.5 object-contain brightness-0 invert" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight text-foreground">
                      AfuAI
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      {selectedModel.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} className="h-8 w-8 rounded-full hover:bg-muted">
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-8 w-8 rounded-full hover:bg-muted">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={closeAfuAI} className="h-8 w-8 rounded-full hover:bg-muted">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto"
                style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
              >
                <div className="mx-auto px-4 py-6 max-w-full">
                  {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 via-primary/10 to-purple-500/10 flex items-center justify-center mb-5 shadow-inner">
                        <Sparkles className="h-9 w-9 text-primary" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">What can I help with?</h2>
                      <p className="text-sm text-muted-foreground mt-2 max-w-[280px] leading-relaxed">
                        Ask anything, create posts for your feed, or get insights about your account.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-6 max-w-[320px] justify-center">
                        {['Create a post', 'My stats', 'What\'s trending?'].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => { setInput(suggestion); }}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/50 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
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
                          "px-4 py-3 rounded-2xl max-w-[88%]",
                          msg.role === 'user'
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted/50 border border-border/50 rounded-bl-md"
                        )}>
                          <AIMessageContent content={msg.content} isUser={msg.role === 'user'} />
                          {msg.imageUrl && (
                            <div className="mt-3">
                              <GeneratedImageDisplay imageUrl={msg.imageUrl} prompt={msg.content} />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-1.5 px-1 tabular-nums">
                          {format(msg.timestamp, 'HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {loading && currentThinking && (
                    <div className="mt-5 animate-in slide-in-from-bottom-3 duration-300">
                      <ThinkingDisplay
                        thought={currentThinking}
                        isStreaming={isThinkingStreaming}
                        isComplete={thinkingComplete}
                        className="w-full"
                      />
                    </div>
                  )}

                  {loading && thinkingComplete && !currentThinking && (
                    <div className="flex items-start mt-5">
                      <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
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
                "shrink-0 bg-background border-t border-border",
                isMobile ? "p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" : "p-3"
              )}>
                <div className="mx-auto max-w-full">
                  <div className="relative bg-muted/40 border border-border/60 rounded-2xl p-2.5 focus-within:border-primary/40 focus-within:shadow-sm transition-all">
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${selectedModel.name}...`}
                        className="min-h-[40px] max-h-[120px] flex-1 bg-transparent border-0 focus-visible:ring-0 py-2 px-1 text-[15px] resize-none placeholder:text-muted-foreground/60"
                        rows={1}
                        disabled={loading}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className={cn(
                          "h-9 w-9 shrink-0 rounded-full transition-all active:scale-95",
                          input.trim() && !loading
                            ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                            : "bg-muted text-muted-foreground"
                        )}
                        size="icon"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                      </Button>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-background/80 hover:bg-muted border border-border/40 transition-colors" disabled={loading}>
                            <span>{selectedModel.icon}</span>
                            <span className={isMobile ? "hidden" : "inline"}>{selectedModel.name}</span>
                            <span className={isMobile ? "inline" : "hidden"}>{selectedModel.name.split(' ')[0]}</span>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 z-[300]">
                          {aiModels.map((model) => (
                            <DropdownMenuItem
                              key={model.id}
                              onClick={() => !model.comingSoon && setSelectedModel(model)}
                              disabled={model.comingSoon}
                              className={cn(
                                "flex items-center gap-2",
                                model.comingSoon ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                                selectedModel.id === model.id && !model.comingSoon && "bg-primary/10 text-primary"
                              )}
                            >
                              <span className="text-base">{model.icon}</span>
                              <span className="font-medium">{model.name}</span>
                              {model.comingSoon && (
                                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Soon</span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        onClick={() => setWebSearchMode(!webSearchMode)}
                        disabled={loading}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                          webSearchMode
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background/80 text-muted-foreground border-border/40 hover:bg-muted"
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
