import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Bot, Copy, Check, PenSquare, ArrowUp, History, Globe, X, Image as ImageIcon, Paperclip, Trash2, Sparkles, FileText, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { PremiumGate } from '@/components/PremiumGate';
import { parseRichText } from '@/lib/richTextUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, isYesterday } from 'date-fns';
import { compressImageFile } from '@/lib/imageCompression';
import { cn } from "@/lib/utils";

// --- Types & Constants ---

const parseAIResponse = (content: string): React.ReactNode => {
  const pageNames: Record<string, string> = {
    '/support': 'Support', '/privacy': 'Privacy Policy', '/terms': 'Terms of Use',
    '/premium': 'Premium', '/home': 'Home', '/feed': 'Feed', '/chats': 'Messages',
    '/notifications': 'Notifications', '/search': 'Search', '/settings': 'Settings',
    '/profile': 'Profile', '/wallet': 'Wallet', '/gifts': 'Gifts', '/games': 'Games',
    '/moments': 'Moments', '/creator-earnings': 'Creator Earnings',
    '/auth/signin': 'Sign In', '/auth/signup': 'Sign Up',
  };

  const pathRegex = /(\/[a-z\-\/]+)/gi;
  const parts = content.split(pathRegex);
  
  return parts.map((part, index) => {
    const lowerPart = part.toLowerCase();
    if (pageNames[lowerPart]) {
      return (
        <Link key={index} to={lowerPart} className="text-primary hover:underline font-semibold">
          {pageNames[lowerPart]}
        </Link>
      );
    }
    return <span key={index}>{parseRichText(part)}</span>;
  });
};

interface Message {
  id?: string; role: 'user' | 'assistant'; content: string;
  timestamp: Date; attachments?: Attachment[]; generatedImages?: GeneratedImage[];
}

interface Attachment { type: 'image' | 'file'; url: string; name: string; size?: number; }
interface GeneratedImage { url: string; }
interface ChatSession { id: string; title: string; created_at: string; updated_at: string; }

interface AIModel { id: string; name: string; description: string; icon: string; tier: 'fast' | 'balanced' | 'powerful'; }

const AI_MODELS: AIModel[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast & efficient', icon: '⚡', tier: 'fast' },
  { id: 'google/gemini-2.5-flash-image', name: 'Image Gen', description: 'Create images', icon: '🎨', tier: 'balanced' },
  { id: 'google/gemini-3-pro-image-preview', name: 'Image Pro', description: 'High quality', icon: '🖼️', tier: 'powerful' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5', description: 'Balanced', icon: '🚀', tier: 'balanced' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', description: 'Reasoning', icon: '🧠', tier: 'powerful' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Fast', icon: '💨', tier: 'fast' },
  { id: 'openai/gpt-5', name: 'GPT-5', description: 'Powerful', icon: '🔥', tier: 'powerful' },
];

const isImageModel = (modelId: string) => modelId.includes('image');

const AIChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<{ avatar_url: string | null; display_name: string } | null>(null);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);

  // --- Logic & Handlers ---

  useEffect(() => {
    if (!user) {
      toast.error('Please log in');
      navigate('/auth');
    } else {
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('avatar_url, display_name').eq('id', user.id).single();
        if (data) setProfile(data);
      };
      fetchProfile();
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    setIsLoadingSessions(true);
    const { data } = await supabase.from('ai_chat_sessions').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30);
    if (data) setSessions(data);
    setIsLoadingSessions(false);
  };

  const loadSessionMessages = async (sessionId: string) => {
    const { data } = await supabase.from('ai_chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map((msg: any) => ({
        id: msg.id, role: msg.role, content: msg.content,
        timestamp: new Date(msg.created_at), attachments: msg.attachments || []
      })));
      setCurrentSessionId(sessionId);
      setIsHistoryOpen(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || loading) return;
    
    let uploaded: Attachment[] = [];
    if (attachments.length > 0) {
      toast.info('Uploading files...');
      for (let i = 0; i < attachments.length; i++) {
        const file = attachments[i];
        const fileName = `${user?.id}/${Date.now()}-${i}`;
        const { data } = await supabase.storage.from('ai-chat-attachments').upload(fileName, file);
        if (data) {
          const { data: url } = supabase.storage.from('ai-chat-attachments').getPublicUrl(fileName);
          uploaded.push({ type: file.type.startsWith('image/') ? 'image' : 'file', url: url.publicUrl, name: file.name });
        }
      }
    }

    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date(), attachments: uploaded };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setAttachmentPreviews([]);
    setLoading(true);

    let sId = currentSessionId;
    if (!sId) {
      const { data } = await supabase.from('ai_chat_sessions').insert({ user_id: user?.id, title: userMsg.content.slice(0, 40) }).select().single();
      if (data) { sId = data.id; setCurrentSessionId(sId); setSessions(prev => [data, ...prev]); }
    }

    try {
      const { data, error } = await supabase.functions.invoke(isImageModel(selectedModel.id) ? 'generate-ai-image' : 'chat-with-afuai', {
        body: { 
          message: userMsg.content, model: selectedModel.id, 
          webSearchMode, attachments: uploaded,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (data) {
        const assistantMsg: Message = {
          role: 'assistant', content: data.reply, timestamp: new Date(),
          generatedImages: data.images?.map((url: string) => ({ url }))
        };
        setMessages(prev => [...prev, assistantMsg]);
        await supabase.from('ai_chat_messages').insert([
          { session_id: sId, role: 'user', content: userMsg.content, attachments: uploaded },
          { session_id: sId, role: 'assistant', content: assistantMsg.content, generatedImages: assistantMsg.generatedImages }
        ]);
      }
    } catch (e) { toast.error('Check your connection'); }
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const processed = file.type.startsWith('image/') ? await compressImageFile(file) : file;
      setAttachments(prev => [...prev, processed]);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setAttachmentPreviews(prev => [...prev, e.target?.result as string]);
        reader.readAsDataURL(processed);
      } else {
        setAttachmentPreviews(prev => [...prev, '']);
      }
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  return (
    <PremiumGate feature="AI Chat Assistant" showUpgrade={true} requiredTier="platinum">
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        
        {/* Mobile Header */}
        <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/40 bg-background/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} className="rounded-full">
              <History className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">AfuAI</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {selectedModel.name}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { setMessages([]); setCurrentSessionId(null); }} className="rounded-full">
            <PenSquare className="h-5 w-5 text-primary" />
          </Button>
        </header>

        {/* Chat Canvas */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 rotate-3">
                  <Bot className="h-10 w-10 text-primary -rotate-3" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">How can I assist you?</h2>
                  <p className="text-sm text-muted-foreground max-w-[280px]">
                    I can generate art, search the web, or analyze your documents.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "relative max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-card border border-border/60 rounded-tl-none"
                  )}>
                    {msg.attachments?.map((a, i) => (
                      <div key={i} className="mb-2">
                        {a.type === 'image' ? <img src={a.url} className="rounded-lg max-h-48 w-full object-cover" /> : <div className="p-2 bg-black/10 rounded flex items-center gap-2 text-xs"><FileText className="h-3 w-3"/>{a.name}</div>}
                      </div>
                    ))}
                    {msg.generatedImages?.map((img, i) => (
                      <img key={i} src={img.url} className="rounded-lg mb-2 border border-white/10 shadow-lg" />
                    ))}
                    <div className="whitespace-pre-wrap">
                      {msg.role === 'assistant' ? parseAIResponse(msg.content) : msg.content}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1.5 px-1 uppercase font-medium tracking-wider">
                    {format(msg.timestamp, 'HH:mm')}
                  </span>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-3 px-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase">Processing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Action Bar & Model Switcher */}
        <div className="shrink-0 p-3 pb-6 bg-background border-t border-border/40">
          <div className="max-w-3xl mx-auto space-y-3">
            
            {/* Quick-Switch Model Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setWebSearchMode(!webSearchMode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all shrink-0 border",
                  webSearchMode ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground"
                )}
              >
                <Globe className="h-3 w-3" /> Web
              </button>
              <div className="w-[1px] h-4 bg-border shrink-0" />
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all shrink-0 border",
                    selectedModel.id === m.id ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground"
                  )}
                >
                  <span>{m.icon}</span> {m.name}
                </button>
              ))}
            </div>

            {/* Input Wrapper */}
            <div className="relative bg-card border border-border rounded-[24px] p-2 focus-within:ring-2 ring-primary/20 transition-all shadow-sm">
              {attachmentPreviews.length > 0 && (
                <div className="flex gap-2 p-2 mb-2 overflow-x-auto">
                  {attachmentPreviews.map((p, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-lg bg-muted overflow-hidden border border-border">
                      {p ? <img src={p} className="w-full h-full object-cover" /> : <FileText className="m-auto h-4 w-4" />}
                      <button onClick={() => {
                        setAttachments(a => a.filter((_, idx) => idx !== i));
                        setAttachmentPreviews(a => a.filter((_, idx) => idx !== i));
                      }} className="absolute top-0 right-0 bg-primary text-white p-0.5 rounded-bl-lg"><X size={10}/></button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-end gap-1">
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground rounded-full" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
                
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Ask anything..."
                  className="min-h-[40px] max-h-[150px] bg-transparent border-0 focus-visible:ring-0 py-2.5 px-1 text-[15px] resize-none"
                  rows={1}
                />

                <Button
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || loading}
                  className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 rounded-full shadow-lg"
                  size="icon"
                >
                  <ArrowUp className="h-5 w-5 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar History */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="left" className="w-[85%] sm:max-w-xs p-0 border-r border-border/40">
            <SheetHeader className="p-4 border-b border-border/40">
              <SheetTitle className="text-sm font-bold uppercase tracking-widest text-primary">Chat Archive</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full pb-20">
              <div className="p-3 space-y-2">
                {sessions.map(s => (
                  <div key={s.id} onClick={() => loadSessionMessages(s.id)} className={cn("group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all", currentSessionId === s.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted")}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{format(new Date(s.updated_at), 'MMM d')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100" />
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

export default AIChat;
