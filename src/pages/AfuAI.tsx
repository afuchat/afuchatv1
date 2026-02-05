import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, History, Globe, ChevronDown, BrainCircuit, ChevronUp, Sparkles, Plus, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { PremiumGate } from '@/components/PremiumGate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { useIsMobile } from '@/hooks/use-mobile';
import AIMessageContent from '@/components/afuai/AIMessageContent';
import GeneratedImageDisplay from '@/components/afuai/GeneratedImageDisplay';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  timestamp: Date;
  attachments?: any[];
  imageUrl?: string;
}

interface Session {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface AIModel { id: string; name: string; icon: string; isImageModel?: boolean; }

const AI_MODELS: AIModel[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: '⚡' },
  { id: 'google/gemini-2.5-flash-image', name: 'Image Gen', icon: '🎨', isImageModel: true },
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', icon: '🧠' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', icon: '💨' },
];

// Typing animation component for thinking
const ThinkingAnimation = ({ thought, isComplete }: { thought: string; isComplete: boolean }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (isComplete) {
      setDisplayedText(thought);
      return;
    }
    
    if (currentIndex < thought.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + thought[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 15); // Speed of typing
      return () => clearTimeout(timer);
    }
  }, [currentIndex, thought, isComplete]);
  
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [thought]);
  
  return (
    <div className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
      {displayedText.split('\n').map((line, i) => (
        <div key={i} className="flex items-start gap-2 mb-1">
          {line.startsWith('User requested:') ? (
            <span className="text-primary font-medium">{line}</span>
          ) : (
            <span className="opacity-80">{line}</span>
          )}
        </div>
      ))}
      {!isComplete && currentIndex < thought.length && (
        <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />
      )}
    </div>
  );
};

const AfuAI: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<any>(null);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<string | null>(null);
  const [thinkingComplete, setThinkingComplete] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch profile
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('avatar_url, display_name, handle').eq('id', user.id).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user, navigate]);

  // Fetch chat sessions
  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    
    if (data && !error) {
      setSessions(data);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load messages for a session
  const loadSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, created_at, attachments')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data && !error) {
      setMessages(data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        attachments: msg.attachments as any[]
      })));
      setCurrentSessionId(sessionId);
      setIsHistoryOpen(false);
    }
  };

  // Create new session
  const createNewSession = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select()
      .single();

    if (data && !error) {
      setCurrentSessionId(data.id);
      setMessages([]);
      fetchSessions();
      return data.id;
    }
    return null;
  };

  // Start new chat
  const handleNewChat = async () => {
    await createNewSession();
    setIsHistoryOpen(false);
  };

  // Save message to database
  const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string) => {
    await supabase.from('ai_chat_messages').insert({
      session_id: sessionId,
      role,
      content
    });
    
    // Update session title if first message
    if (role === 'user' && messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await supabase.from('ai_chat_sessions').update({ title, updated_at: new Date().toISOString() }).eq('id', sessionId);
      fetchSessions();
    } else {
      await supabase.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        toast.error('Failed to create session');
        return;
      }
    }

    const userMessage = input.trim();
    const userMsg: Message = { role: 'user', content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    // Check if using image generation model
    const isImageGeneration = selectedModel.isImageModel;
    
    // Start showing thinking immediately with user's request
    setCurrentThinking(`User requested: "${userMessage.length > 80 ? userMessage.substring(0, 80) + '...' : userMessage}"\n${isImageGeneration ? 'Generating image based on your description...' : 'Analyzing context and preparing response...'}`);
    setThinkingComplete(false);

    // Save user message
    await saveMessage(sessionId, 'user', userMessage);

    try {
      if (isImageGeneration) {
        // Handle image generation
        const { data, error } = await supabase.functions.invoke('generate-ai-image', {
          body: { prompt: userMessage }
        });
        
        if (error) throw error;
        
        setThinkingComplete(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get the first image URL from the response
        const imageUrl = data?.images?.[0] || null;
        
        const assistantMsg: Message = {
          role: 'assistant',
          content: data?.reply || `Here's the image I generated based on your request!`,
          imageUrl: imageUrl,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setCurrentThinking(null);
        await saveMessage(sessionId, 'assistant', assistantMsg.content);
      } else {
        // Regular chat
        const { data } = await supabase.functions.invoke('chat-with-afuai', {
          body: { message: userMessage, model: selectedModel.id, webSearchMode }
        });
        
        if (data) {
          // Update thinking with full thought from AI
          if (data.thought) {
            setCurrentThinking(data.thought);
          }
          setThinkingComplete(true);
          
          // Small delay to let thinking animation complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const assistantMsg: Message = {
            role: 'assistant',
            content: data.reply,
            thought: data.thought,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMsg]);
          setCurrentThinking(null);
          await saveMessage(sessionId, 'assistant', data.reply);
        }
      }
    } catch (e) { 
      toast.error('Response failed'); 
      setCurrentThinking(null);
    } finally { 
      setLoading(false);
      setThinkingComplete(false);
    }
  };

  // Delete session
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

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, loading, currentThinking]);

  const profileLink = user ? `/${profile?.handle || user.id}` : '/auth';

  return (
    <PremiumGate feature="AI Chat Assistant" showUpgrade={true} requiredTier="platinum">
      <div className="fixed inset-0 flex flex-col bg-background text-foreground">
        
        {/* FIXED HEADER */}
        <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/40 bg-background/95 backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} className="rounded-full">
              <History className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">AfuAI</span>
              <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">Platinum Tier</span>
            </div>
          </div>
          <Link to={profileLink}>
            <Avatar className="h-8 w-8 border border-primary/20 cursor-pointer hover:ring-2 ring-primary/30 transition-all">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{profile?.display_name?.[0]}</AvatarFallback>
            </Avatar>
          </Link>
        </header>

        {/* SCROLLABLE MESSAGES AREA */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto",
            "bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent",
            !isMobile && "desktop-scrollbar"
          )}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          <div className={cn("mx-auto p-4 space-y-6", isMobile ? "max-w-full" : "max-w-3xl")}>
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Welcome back</h2>
                <p className="text-sm text-muted-foreground">How can I assist your workflow today?</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex flex-col w-full animate-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "items-end" : "items-start")}>
                {/* Collapsible thought for past messages */}
                {msg.role === 'assistant' && msg.thought && (
                  <div className={cn("mb-2 overflow-hidden border border-border/40 rounded-xl bg-muted/20", isMobile ? "w-[90%]" : "w-[85%]")}>
                    <button 
                      onClick={() => setExpandedThoughts(p => ({...p, [idx]: !p[idx]}))}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                        Reasoning
                      </div>
                      {expandedThoughts[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {expandedThoughts[idx] && (
                      <div className="px-3 pb-3 border-t border-border/10 pt-2 bg-background/40">
                        <ThinkingAnimation thought={msg.thought} isComplete={true} />
                      </div>
                    )}
                  </div>
                )}
                <div className={cn(
                  "px-4 py-3 rounded-2xl shadow-sm",
                  isMobile ? "max-w-[90%]" : "max-w-[85%]",
                  msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border/60 rounded-tl-none"
                )}>
                  <AIMessageContent content={msg.content} isUser={msg.role === 'user'} />
                  {msg.imageUrl && (
                    <GeneratedImageDisplay imageUrl={msg.imageUrl} prompt={msg.content} />
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 px-1 uppercase tracking-widest">{format(msg.timestamp, 'HH:mm')}</span>
              </div>
            ))}
            
            {/* Real-time thinking display while loading */}
            {loading && currentThinking && (
              <div className="flex flex-col items-start animate-in slide-in-from-bottom-2 duration-300">
                <div className={cn("mb-2 overflow-hidden border border-primary/30 rounded-xl bg-primary/5", isMobile ? "w-[90%]" : "w-[85%]")}>
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20">
                    <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Thinking...</span>
                  </div>
                  <div className="px-3 py-3 bg-background/60">
                    <ThinkingAnimation thought={currentThinking} isComplete={thinkingComplete} />
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading dots when waiting for response after thinking */}
            {loading && thinkingComplete && (
              <div className="flex items-start">
                <div className="bg-card border border-border/60 rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-32" />
          </div>
        </div>

        {/* FIXED INPUT AREA - with bottom padding for navigation */}
        <div className={cn(
          "shrink-0 bg-background border-t border-border/40 z-50",
          isMobile ? "p-3 pb-20" : "p-4"
        )}>
          <div className={cn("mx-auto", isMobile ? "max-w-full" : "max-w-3xl")}>
            <div className="relative bg-card border border-border rounded-2xl p-2 focus-within:ring-2 ring-primary/20 transition-all shadow-xl shadow-black/5">
              
              {/* Input Row */}
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
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
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </div>

              {/* Bottom Controls Row */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                {/* Model Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-muted hover:bg-muted/80 transition-colors" disabled={loading}>
                      <span>{selectedModel.icon}</span>
                      <span className={isMobile ? "hidden" : "inline"}>{selectedModel.name}</span>
                      <span className={isMobile ? "inline" : "hidden"}>{selectedModel.name.split(' ')[0]}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-popover border border-border shadow-xl z-[100]">
                    {AI_MODELS.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          selectedModel.id === model.id && "bg-primary/10 text-primary"
                        )}
                      >
                        <span className="text-base">{model.icon}</span>
                        <span className="font-medium">{model.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Web Search Toggle */}
                <button
                  onClick={() => setWebSearchMode(!webSearchMode)}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all",
                    webSearchMode 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <Globe className="h-3 w-3" />
                  <span>Web</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="left" className={cn("border-r border-border/40", isMobile ? "w-[85%]" : "w-80")}>
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
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No chat history yet
                  </div>
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
                          <p className="text-sm font-medium truncate">{session.title || "New Chat"}</p>
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
      </div>
    </PremiumGate>
  );
};

export default AfuAI;
