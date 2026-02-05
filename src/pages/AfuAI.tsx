import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, History, Globe, ChevronDown, BrainCircuit, ChevronUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PremiumGate } from '@/components/PremiumGate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  timestamp: Date;
  attachments?: any[];
}

interface AIModel { id: string; name: string; icon: string; }

const AI_MODELS: AIModel[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: '⚡' },
  { id: 'google/gemini-2.5-flash-image', name: 'Image Gen', icon: '🎨' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', icon: '🧠' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', icon: '💨' },
];

const AfuAI: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThought, setShowThought] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) navigate('/auth');
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('avatar_url, display_name').eq('id', user?.id).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await supabase.functions.invoke('chat-with-afuai', {
        body: { message: userMsg.content, model: selectedModel.id, webSearchMode }
      });
      if (data) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          thought: data.thought || "Analyzing your request based on current context...",
          timestamp: new Date()
        }]);
      }
    } catch (e) { toast.error('Response failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  return (
    <PremiumGate feature="AI Chat Assistant" showUpgrade={true} requiredTier="platinum">
      <div className="flex flex-col h-[100dvh] bg-background text-foreground">
        
        {/* HEADER */}
        <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/40 bg-background/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} className="rounded-full">
              <History className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">AfuAI</span>
              <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">Platinum Tier</span>
            </div>
          </div>
          <Avatar className="h-8 w-8 border border-primary/20">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{profile?.display_name?.[0]}</AvatarFallback>
          </Avatar>
        </header>

        {/* SCROLLABLE MESSAGES AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
          <div className="max-w-3xl mx-auto p-4 space-y-6">
            {messages.length === 0 && (
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
                {msg.role === 'assistant' && msg.thought && (
                  <div className="w-[85%] mb-2 overflow-hidden border border-border/40 rounded-xl bg-muted/20">
                    <button 
                      onClick={() => setShowThought(p => ({...p, [idx]: !p[idx]}))}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <BrainCircuit className={cn("h-3.5 w-3.5", loading ? "animate-pulse text-primary" : "text-primary")} />
                        Reasoning
                      </div>
                      {showThought[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showThought[idx] && (
                      <div className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground border-t border-border/10 pt-2 bg-background/40 italic">
                        {msg.thought}
                      </div>
                    )}
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed",
                  msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border/60 rounded-tl-none"
                )}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 px-1 uppercase tracking-widest">{format(msg.timestamp, 'HH:mm')}</span>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-24" />
          </div>
        </div>

        {/* FIXED INPUT AREA WITH MODEL DROPDOWN */}
        <div className="shrink-0 p-3 pb-6 bg-background border-t border-border/40 z-50">
          <div className="max-w-3xl mx-auto">
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
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-muted hover:bg-muted/80 transition-colors">
                      <span>{selectedModel.icon}</span>
                      <span>{selectedModel.name}</span>
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
          <SheetContent side="left" className="w-[85%] border-r border-border/40">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-xs font-black uppercase tracking-widest text-primary">Chat Archive</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full pb-20">
              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <div key={i} className="p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer border border-transparent hover:border-border">
                    <p className="text-sm font-bold truncate">{s.title || "New Session"}</p>
                    <p className="text-[10px] opacity-40 uppercase">{format(new Date(), 'MMM d')}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </PremiumGate>
  );
};

export default AfuAI;
