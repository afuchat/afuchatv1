import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, X, Maximize2, Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AIMessageContent from '@/components/afuai/AIMessageContent';
import aiChatIcon from '@/assets/ai-chat-icon.ico';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AfuAISidebarPanelProps {
  onClose: () => void;
}

export const AfuAISidebarPanel = ({ onClose }: AfuAISidebarPanelProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-afuai', {
        body: {
          message: userMessage.content,
          model: 'google/gemini-3-flash-preview',
          webSearch: false,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data?.reply || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AfuAI error:', error);
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src={aiChatIcon} alt="AfuAI" className="h-5 w-5 object-contain" />
          <span className="font-semibold text-sm">AfuAI</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/afuai')}
            title="Open full page"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Ask AfuAI anything</p>
              <p className="text-xs text-muted-foreground">Quick questions, ideas, help — right here.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <img src={aiChatIcon} alt="AI" className="h-6 w-6 flex-shrink-0 mt-1 object-contain" />
              )}
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm max-w-[85%]",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.role === 'assistant' ? (
                  <AIMessageContent content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && profile?.avatar_url && (
                <Avatar className="h-6 w-6 flex-shrink-0 mt-1">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-[10px]">{profile.display_name?.[0]}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-start">
              <img src={aiChatIcon} alt="AI" className="h-6 w-6 flex-shrink-0 mt-1 object-contain" />
              <div className="bg-muted rounded-2xl px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-xl"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-xl flex-shrink-0"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
