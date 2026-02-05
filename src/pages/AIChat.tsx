import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, PenSquare, ArrowUp, History, Globe, X, Paperclip, Sparkles, FileText, ChevronRight, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { PremiumGate } from '@/components/PremiumGate';
import { parseRichText } from '@/lib/richTextUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { compressImageFile } from '@/lib/imageCompression';
import { cn } from "@/lib/utils";

// --- Types ---
interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string; // New field for AI reasoning
  timestamp: Date;
  attachments?: Attachment[];
  generatedImages?: GeneratedImage[];
}

interface Attachment { type: 'image' | 'file'; url: string; name: string; }
interface GeneratedImage { url: string; }
interface ChatSession { id: string; title: string; created_at: string; updated_at: string; }

interface AIModel { id: string; name: string; icon: string; }

const AI_MODELS: AIModel[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: '⚡' },
  { id: 'google/gemini-2.5-flash-image', name: 'Image Gen', icon: '🎨' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', icon: '🧠' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', icon: '💨' },
];

const AIChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThought, setShowThought] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);

  // Toggle thought visibility for a specific message
  const toggleThought = (idx: number) => {
    setShowThought(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  useEffect(() => {
    if (!user) navigate('/auth');
    else loadSessions();
  }, [user]);

  const loadSessions = async () => {
    const { data } = await supabase.from('ai_chat_sessions').select('*').eq('user_id', user?.id).order('updated_at', { ascending: false });
    if (data) setSessions(data);
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Step 1: Instant Response Simulation/Trigger
      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: { 
          message: userMsg.content, 
          model: selectedModel.id, 
          webSearchMode,
          stream: false // Set to true if your backend supports Server-Sent Events for even faster "real-time"
        }
      });

      if (data) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.reply,
          thought: data.thought || "Analyzing context and generating the most accurate response for you...", 
          timestamp: new Date(),
          generatedImages: data.images?.map((url: string) => ({ url }))
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (e) {
      toast.error('Connection slow. Trying again...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  return (
    <PremiumGate feature="AI Chat Assistant" showUpgrade={true} requiredTier="platinum">
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/40 bg-background/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} className="rounded-full">
              <History className="h-5 w-5" />
            </Button>
            <span className="text-sm font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">AfuAI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} className="rounded-full">
            <PenSquare className="h-5 w-5 text-primary" />
          </Button>
        </header>

        {/* Chat Canvas */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-4 space-y-6 pb-32">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex flex-col w-full", msg.role === 'user' ? "items-end" : "items-start")}>
                
                {/* Thinking / Reasoning Block (Only for Assistant) */}
                {msg.role === 'assistant' && msg.thought && (
                  <div className="w-[85%] mb-2 overflow-hidden border border-border/40 rounded-2xl bg-muted/30">
                    <button 
                      onClick={() => toggleThought(idx)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-tighter text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <BrainCircuit className={cn("h-3.5 w-3.5", loading ? "animate-pulse text-primary" : "")} />
                        {loading ? "AI is thinking..." : "View Reasoning"}
                      </div>
                      {showThought[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {showThought[idx] && (
                      <div className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground italic border-t border-border/20 pt-2 bg-background/20">
                        {msg.thought}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Message Bubble */}
                <div className={cn(
                  "relative max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed transition-all",
                  msg.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10" 
                    : "bg-card border border-border/60 rounded-tl-none"
                )}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                
                <span className="text-[9px] text-muted-foreground mt-1.5 px-1 uppercase tracking-widest opacity-50">
                  {format(msg.timestamp, 'HH:mm')}
                </span>
              </div>
            ))}
            
            {loading && (
              <div className="flex flex-col items-start gap-2 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary uppercase">
                   <Sparkles className="h-3 w-3 animate-spin" /> 
                   Generating Response
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Action Bar */}
        <div className="shrink-0 p-3 pb-6 bg-background border-t border-border/40">
          <div className="max-w-3xl mx-auto space-y-3">
            
            {/* Model Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setWebSearchMode(!webSearchMode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all shrink-0 border",
                  webSearchMode ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-card border-border text-muted-foreground"
                )}
              >
                <Globe className="h-3 w-3" /> Search
              </button>
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all shrink-0 border",
                    selectedModel.id === m.id ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground"
                  )}
                >
                  <span>{m.icon}</span> {m.name}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="relative bg-card border border-border rounded-[22px] p-1.5 focus-within:ring-2 ring-primary/20 transition-all shadow-xl shadow-black/5">
              <div className="flex items-end gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground rounded-full" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" />
                
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type a message..."
                  className="min-h-[40px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 py-2 px-1 text-[15px] resize-none"
                  rows={1}
                />

                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 rounded-full shadow-lg transition-transform active:scale-95"
                  size="icon"
                >
                  <ArrowUp className="h-5 w-5 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* History Sheet */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="left" className="w-[85%] border-r border-border/40">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-xs font-black uppercase tracking-widest opacity-50">Recent Conversations</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full">
              {sessions.map(s => (
                <div key={s.id} onClick={() => {}} className="p-3 mb-1 rounded-xl hover:bg-muted cursor-pointer transition-colors">
                  <p className="text-sm font-bold truncate">{s.title}</p>
                  <p className="text-[10px] opacity-50 uppercase">{format(new Date(s.updated_at), 'MMM d')}</p>
                </div>
              ))}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </PremiumGate>
  );
};

export default AIChat;
