import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Bot, Copy, Check, PenSquare, ArrowUp, History, Globe, X, Image as ImageIcon, Paperclip, Trash2, ChevronLeft, Sparkles, FileText, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { PremiumGate } from '@/components/PremiumGate';
import { parseRichText } from '@/lib/richTextUtils';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, isYesterday } from 'date-fns';
import { compressImageFile } from '@/lib/imageCompression';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// Parse AI responses to convert page paths into clickable links
const parseAIResponse = (content: string): React.ReactNode => {
  const pageNames: Record<string, string> = {
    '/support': 'Support',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms of Use',
    '/premium': 'Premium',
    '/home': 'Home',
    '/feed': 'Feed',
    '/chats': 'Messages',
    '/notifications': 'Notifications',
    '/search': 'Search',
    '/settings': 'Settings',
    '/profile': 'Profile',
    '/wallet': 'Wallet',
    '/gifts': 'Gifts',
    '/games': 'Games',
    '/moments': 'Moments',
    '/creator-earnings': 'Creator Earnings',
    '/auth/signin': 'Sign In',
    '/auth/signup': 'Sign Up',
  };

  const pathRegex = /(\/[a-z\-\/]+)/gi;
  const parts = content.split(pathRegex);
  
  return parts.map((part, index) => {
    const lowerPart = part.toLowerCase();
    if (pageNames[lowerPart]) {
      return (
        <Link
          key={index}
          to={lowerPart}
          className="text-primary hover:underline font-medium"
        >
          {pageNames[lowerPart]}
        </Link>
      );
    }
    return <span key={index}>{parseRichText(part)}</span>;
  });
};

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

interface Attachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface PostDetails {
  postId: string;
  postContent: string;
  postAuthorHandle: string;
}

interface LocationState {
  context?: 'post_analysis';
  postDetails?: PostDetails;
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'fast' | 'balanced' | 'powerful';
}

const AI_MODELS: AIModel[] = [
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Fast & efficient',
    icon: '⚡',
    tier: 'fast',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Balanced performance',
    icon: '🚀',
    tier: 'balanced',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Complex reasoning',
    icon: '🧠',
    tier: 'powerful',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Fast & capable',
    icon: '💨',
    tier: 'fast',
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    description: 'Most powerful',
    icon: '🔥',
    tier: 'powerful',
  },
];

const AIChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<{ avatar_url: string | null; display_name: string } | null>(null);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  
  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  
  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to chat with AfuAI');
      navigate('/auth');
    } else {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      };
      fetchProfile();
      loadSessions();
    }
  }, [user, navigate]);

  const loadSessions = async () => {
    if (!user) return;
    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const loadedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        attachments: (msg.attachments as Attachment[]) || [],
      }));
      
      setMessages(loadedMessages);
      setCurrentSessionId(sessionId);
      setIsHistoryOpen(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat history');
    }
  };

  const createNewSession = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({ user_id: user.id, title: 'New Chat' })
        .select()
        .single();
      
      if (error) throw error;
      setSessions(prev => [data, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const saveMessage = async (sessionId: string, message: Message) => {
    try {
      const { error } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          role: message.role,
          content: message.content,
          attachments: message.attachments || [],
        } as any);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    try {
      await supabase
        .from('ai_chat_sessions')
        .update({ title })
        .eq('id', sessionId);
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title } : s
      ));
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleCopy = async (content: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageIndex);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    if (attachments.length + files.length > 4) {
      toast.error('Maximum 4 files allowed');
      return;
    }
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await compressImageFile(file);
      }
      
      setAttachments(prev => [...prev, processedFile]);
      
      if (processedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachmentPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(processedFile);
      } else {
        setAttachmentPreviews(prev => [...prev, '']);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<Attachment[]> => {
    const uploadedAttachments: Attachment[] = [];
    
    for (let i = 0; i < attachments.length; i++) {
      const file = attachments[i];
      const ext = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${i}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('ai-chat-attachments')
        .upload(fileName, file);
      
      if (error) {
        console.error('Upload error:', error);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('ai-chat-attachments')
        .getPublicUrl(fileName);
      
      uploadedAttachments.push({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: publicUrl,
        name: file.name,
        size: file.size,
      });
    }
    
    return uploadedAttachments;
  };

  const handleSendWithMessage = async (messageText: string) => {
    if ((!messageText.trim() && attachments.length === 0) || loading) return;
    
    if (!user) {
      toast.error('You must be logged in to chat');
      return;
    }

    // Upload attachments first
    let uploadedAttachments: Attachment[] = [];
    if (attachments.length > 0) {
      toast.info('Uploading files...');
      uploadedAttachments = await uploadAttachments();
    }

    const userMessage: Message = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
      attachments: uploadedAttachments,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setAttachmentPreviews([]);
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Create or use existing session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        toast.error('Failed to create chat session');
        setLoading(false);
        return;
      }
      setCurrentSessionId(sessionId);
      updateSessionTitle(sessionId, messageText);
    }

    // Save user message
    await saveMessage(sessionId, userMessage);

    try {
      // Prepare attachment context for AI
      let attachmentContext = '';
      if (uploadedAttachments.length > 0) {
        attachmentContext = '\n\n[User attached files: ' + uploadedAttachments.map(a => 
          `${a.type === 'image' ? '🖼️' : '📄'} ${a.name}`
        ).join(', ') + ']';
      }

      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: {
          message: messageText + attachmentContext,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          webSearchMode: webSearchMode,
          attachments: uploadedAttachments,
          model: selectedModel.id,
        }
      });

      if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        
        if (errorMsg.includes('402') || errorMsg.includes('Payment required')) {
          toast.error('API quota exhausted. Please try again later.');
          return;
        }
        
        if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait a moment.');
          return;
        }
        
        throw error;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(sessionId, assistantMessage);
    } catch (error) {
      console.error('AI Chat error:', error);
      toast.error('Failed to get response from AfuAI');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    await handleSendWithMessage(input);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setCurrentSessionId(null);
    setAttachments([]);
    setAttachmentPreviews([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.context === 'post_analysis' && state.postDetails) {
      const { postContent, postAuthorHandle } = state.postDetails;
      const initialPrompt = `Please analyze this post from @${postAuthorHandle}:\n\n"${postContent}"`;
      navigate(location.pathname, { replace: true, state: {} });
      handleSendWithMessage(initialPrompt);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <PremiumGate feature="AI Chat Assistant" showUpgrade={true} requiredTier="platinum">
      <div className="flex flex-col h-full bg-background relative">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background z-40">
          <ProfileDrawer
            trigger={
              <button className="flex-shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback>{profile?.display_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
              </button>
            }
          />
          
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <span className="text-sm">{selectedModel.icon}</span>
                  </div>
                  <div className="text-left hidden xs:block">
                    <span className="text-sm font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent block leading-tight">
                      AfuAI
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight block">
                      {selectedModel.name}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Select AI Model</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {AI_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`flex items-center gap-3 cursor-pointer ${selectedModel.id === model.id ? 'bg-primary/10' : ''}`}
                  >
                    <span className="text-lg">{model.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{model.name}</p>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    </div>
                    {selectedModel.id === model.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 mr-2">
              <Globe className={`h-4 w-4 ${webSearchMode ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                checked={webSearchMode}
                onCheckedChange={setWebSearchMode}
                className="scale-75"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsHistoryOpen(true)}>
              <History className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleNewChat}>
              <PenSquare className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto pt-16 pb-36">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center mb-4">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Ask me anything about AfuChat, upload images for analysis, or search the web for information.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <button 
                  onClick={() => setInput("What can you help me with?")}
                  className="p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <Bot className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Get started</p>
                  <p className="text-xs text-muted-foreground">Learn what I can do</p>
                </button>
                <button 
                  onClick={() => setInput("How do I earn on AfuChat?")}
                  className="p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <Sparkles className="h-5 w-5 text-yellow-500 mb-2" />
                  <p className="text-sm font-medium">Earn money</p>
                  <p className="text-xs text-muted-foreground">Creator program tips</p>
                </button>
                <button 
                  onClick={() => { setWebSearchMode(true); setInput("Latest tech news today"); }}
                  className="p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <Globe className="h-5 w-5 text-blue-500 mb-2" />
                  <p className="text-sm font-medium">Web search</p>
                  <p className="text-xs text-muted-foreground">Search the internet</p>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <ImageIcon className="h-5 w-5 text-green-500 mb-2" />
                  <p className="text-sm font-medium">Upload image</p>
                  <p className="text-xs text-muted-foreground">Analyze or discuss</p>
                </button>
              </div>
              
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs mt-6 ${webSearchMode ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Globe className="h-4 w-4" />
                <span>
                  {webSearchMode 
                    ? '🔍 Web Search Mode ON - I can search the internet!' 
                    : 'Toggle 🌐 for web search mode'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card
                    className={`max-w-[85%] p-3 relative group ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border-border'
                    }`}
                  >
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((att, attIdx) => (
                          <div key={attIdx}>
                            {att.type === 'image' ? (
                              <img 
                                src={att.url} 
                                alt={att.name}
                                className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                                <FileText className="h-4 w-4" />
                                <span className="text-xs truncate max-w-[100px]">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-[15px] whitespace-pre-wrap select-text leading-[22px]">
                      {msg.role === 'assistant' ? parseAIResponse(msg.content) : parseRichText(msg.content)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[13px] opacity-70">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {msg.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopy(msg.content, idx)}
                        >
                          {copiedId === idx ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] p-3 bg-card border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">AfuAI is thinking...</span>
                    </div>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="fixed bottom-14 left-0 right-0 md:bottom-0 px-3 py-2 bg-background z-40 border-t border-border">
          {/* Attachment Previews */}
          {attachmentPreviews.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
              {attachmentPreviews.map((preview, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  {preview ? (
                    <img 
                      src={preview} 
                      alt={`Attachment ${idx + 1}`}
                      className="w-16 h-16 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-border">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 max-w-lg mx-auto md:max-w-2xl lg:max-w-3xl">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || attachments.length >= 4}
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message AfuAI..."
              className="border-0 bg-transparent p-0 text-[15px] placeholder:text-muted-foreground focus-visible:ring-0 resize-none min-h-[24px] max-h-[100px] flex-1"
              disabled={loading}
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || loading}
              size="icon"
              className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 disabled:opacity-30 flex-shrink-0"
            >
              <ArrowUp className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* History Sheet */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Chat History
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)]">
              <div className="p-2">
                <Button 
                  onClick={() => { handleNewChat(); setIsHistoryOpen(false); }}
                  className="w-full mb-4"
                  variant="outline"
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
                
                {isLoadingSessions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No chat history yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                          currentSessionId === session.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => loadSessionMessages(session.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSessionDate(session.updated_at)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </PremiumGate>
  );
};

export default AIChat;