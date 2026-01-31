import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChatRoomSkeleton } from '@/components/chat/ChatRoomSkeleton';
import { ArrowLeft, Send, MoreVertical, MessageSquare, Mic, MicOff, Play, Pause, Volume2, X, Paperclip, Settings, LogOut, Trash2, Gift, BellOff, Bell, Search } from 'lucide-react';
import { toast } from 'sonner';
import { messageSchema } from '@/lib/validation';
import { ChatRedEnvelope } from '@/components/chat/ChatRedEnvelope';
import { ChatGift } from '@/components/chat/ChatGift';
import { SendRedEnvelopeDialog } from '@/components/chat/SendRedEnvelopeDialog';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { GroupSettingsSheet } from '@/components/chat/GroupSettingsSheet';
import { DateDivider } from '@/components/chat/DateDivider';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { FileUploadPreview } from '@/components/chat/FileUploadPreview';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { WarningBadge } from '@/components/WarningBadge';
import { useChatPreferences } from '@/hooks/useChatPreferences';
import { SendGiftDialog } from '@/components/gifts/SendGiftDialog';
import { ClearHistoryDialog } from '@/components/chat/ClearHistoryDialog';
import { GifPicker } from '@/components/chat/GifPicker';
import { checkContentAllowed } from '@/lib/contentModeration';


interface Message {
  id: string;
  encrypted_content: string;
  audio_url?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  sender_id: string;
  sent_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  edited_at?: string | null;
  reply_to_message_id?: string | null;
  view_count?: number; // For channel messages
  order_context?: {
    order_number?: string;
    order_id?: string;
    customer_id?: string;
    customer_name?: string;
    total?: number;
    type?: 'new_order' | 'cancellation' | 'refund_request' | 'status_update';
    payment_method?: string;
  } | null;
  message_reactions?: Array<{
    reaction: string;
    user_id: string;
  }>;
  reply_to_message?: Array<{
    audio_url?: string;
    encrypted_content: string;
    sender_id?: string;
    profiles?: {
      display_name: string;
      avatar_url?: string | null;
    };
  }>;
  profiles: {
    display_name: string;
    handle: string;
    avatar_url?: string | null;
    is_verified: boolean | null;
    is_organization_verified: boolean | null;
    is_affiliate: boolean | null;
    affiliated_business_id: string | null;
  };
  message_status?: Array<{
    read_at: string | null;
    delivered_at: string | null;
    user_id: string;
  }>;
}

interface RedEnvelope {
  id: string;
  sender_id: string;
  total_amount: number;
  recipient_count: number;
  claimed_count: number;
  message: string | null;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface ChatInfo {
  name: string | null;
  is_group: boolean;
  is_channel?: boolean;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
}

interface OtherUserProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  last_seen: string | null;
  show_online_status: boolean | null;
  is_verified: boolean | null;
  is_organization_verified: boolean | null;
  is_affiliate: boolean | null;
  affiliated_business_id: string | null;
  is_warned?: boolean | null;
  warning_reason?: string | null;
}

const formatLastSeen = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface ChatRoomProps {
  isEmbedded?: boolean;
}

// ChatRoom component
const ChatRoom = ({ isEmbedded = false }: ChatRoomProps) => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { preferences: chatPreferences, loading: prefsLoading } = useChatPreferences();
  const [messages, setMessages] = useState<Message[]>([]);
  const [redEnvelopes, setRedEnvelopes] = useState<RedEnvelope[]>([]);
  const [chatGifts, setChatGifts] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(false);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm');
  const [uploading, setUploading] = useState(false);
  const [audioPlayers, setAudioPlayers] = useState<{ [key: string]: { isPlaying: boolean; audio: HTMLAudioElement | null; duration?: number; currentTime?: number } }>({});
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserDisplayNameRef = useRef<string | null>(null);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [isMember, setIsMember] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [prevGiftCount, setPrevGiftCount] = useState(0);
  const [prevEnvelopeCount, setPrevEnvelopeCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [afuAIProcessing, setAfuAIProcessing] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);

  // Improved scroll behavior - scroll to bottom on new messages
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'instant',
        block: 'end'
      });
    }
  };

  useEffect(() => {
    if (messages.length > prevMessageCount) {
      // Only smooth scroll for new messages, instant for initial load
      scrollToBottom(prevMessageCount > 0);
      setPrevMessageCount(messages.length);
    }
  }, [messages.length, prevMessageCount]);

  // Also scroll when gifts or red envelopes arrive (they're part of the same timeline)
  useEffect(() => {
    if (chatGifts.length > prevGiftCount) {
      scrollToBottom(prevGiftCount > 0);
      setPrevGiftCount(chatGifts.length);
    }
  }, [chatGifts.length, prevGiftCount]);

  useEffect(() => {
    if (redEnvelopes.length > prevEnvelopeCount) {
      scrollToBottom(prevEnvelopeCount > 0);
      setPrevEnvelopeCount(redEnvelopes.length);
    }
  }, [redEnvelopes.length, prevEnvelopeCount]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [loading]);

  // Handle pre-filled message from navigation state (e.g., hiring)
  useEffect(() => {
    const state = location.state as { prefillMessage?: string } | null;
    if (state?.prefillMessage) {
      setNewMessage(state.prefillMessage);
      // Clear the state to prevent re-filling on navigation
      window.history.replaceState({}, document.title);
      // Focus and auto-resize textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
      }, 100);
    }
  }, [location.state]);

  // Update user's last_seen on mount and fetch display name for typing
  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      const { data } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .select('display_name')
        .single();
      
      if (data) {
        currentUserDisplayNameRef.current = data.display_name;
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Set up presence tracking and typing indicators
  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase.channel(`presence-${chatId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Check if other user is present
        if (otherUser) {
          const isPresent = Object.keys(state).some(key => 
            state[key].some((p: any) => p.user_id === otherUser.id)
          );
          setOnline(isPresent);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (otherUser && newPresences.some((p: any) => p.user_id === otherUser.id)) {
          setOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (otherUser && leftPresences.some((p: any) => p.user_id === otherUser.id)) {
          setOnline(false);
        }
      })
      // Typing indicator via broadcast
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.display_name)) {
              return [...prev, payload.display_name];
            }
            return prev;
          });
          // Auto-remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(name => name !== payload.display_name));
          }, 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setTypingUsers(prev => prev.filter(name => name !== payload.display_name));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    setPresenceChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, otherUser]);

  useEffect(() => {
    if (!chatId || !user) return;

    // Fetch all data in parallel for faster loading
    Promise.all([
      fetchChatInfo(),
      fetchMessages(),
      fetchRedEnvelopes(),
      fetchChatGifts()
    ]);

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          try {
            // Fetch profile data
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('display_name, handle, avatar_url, is_verified, is_organization_verified, is_affiliate, affiliated_business_id, is_warned, warning_reason')
              .eq('id', payload.new.sender_id)
              .single();
              
            if (profileError || !profile) return;

            // Fetch reply_to_message data if this message is a reply
            let replyData: any[] = [];
            if (payload.new.reply_to_message_id) {
              const { data: replyMsg } = await supabase
                .from('messages')
                .select('encrypted_content, audio_url, sender_id, profiles(display_name, avatar_url)')
                .eq('id', payload.new.reply_to_message_id)
                .single();
              
              if (replyMsg) {
                replyData = [replyMsg];
              }
            }

            const newMsg = {
              id: payload.new.id,
              encrypted_content: payload.new.encrypted_content,
              audio_url: payload.new.audio_url,
              attachment_url: payload.new.attachment_url,
              attachment_type: payload.new.attachment_type,
              attachment_name: payload.new.attachment_name,
              attachment_size: payload.new.attachment_size,
              sender_id: payload.new.sender_id,
              sent_at: payload.new.sent_at,
              reply_to_message_id: payload.new.reply_to_message_id,
              reply_to_message: replyData,
              order_context: payload.new.order_context,
              profiles: profile,
              message_status: [],
              message_reactions: [],
            } as Message;
            
            setMessages((prev) => {
              // Prevent duplicates (message may already exist from optimistic update)
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
                
            // Mark as delivered and read if we're the recipient
            if (user && payload.new.sender_id !== user.id) {
              const now = new Date().toISOString();
              
              // Update message_status for read receipts
              await supabase
                .from('message_status')
                .upsert(
                  {
                    message_id: payload.new.id,
                    user_id: user.id,
                    delivered_at: now,
                    read_at: now,
                  },
                  { onConflict: 'message_id,user_id' }
                );
            }
          } catch (error) {
            console.error('Error processing new message:', error);
          }
        }
      )
      .subscribe();

    // Real-time red envelope updates
    const envelopeChannel = supabase
      .channel(`red-envelopes-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'red_envelopes',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchRedEnvelopes();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'red_envelope_claims',
        },
        (payload) => {
          // Show notification when someone claims
          const claim = payload.new;
          if (claim.claimer_id !== user?.id) {
            toast.info('Someone just claimed a red envelope! 🧧', {
              duration: 2000
            });
            fetchRedEnvelopes();
          }
        }
      )
      .subscribe();

    // Real-time chat gifts subscription
    const giftChannel = supabase
      .channel(`chat-gifts-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchChatGifts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gift_transactions',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchChatGifts();
        }
      )
      .subscribe();


    // Subscribe to message status changes (read receipts) - real-time updates
    const statusChannel = supabase
      .channel(`message-status-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_status',
        },
        (payload) => {
          // Update message status in state directly for real-time feedback
          const statusUpdate = payload.new as { message_id: string; user_id: string; delivered_at: string | null; read_at: string | null };
          if (statusUpdate && statusUpdate.message_id) {
            setMessages((prev) => 
              prev.map((msg) => {
                if (msg.id === statusUpdate.message_id) {
                  const existingStatus = msg.message_status || [];
                  const statusIndex = existingStatus.findIndex(s => s.user_id === statusUpdate.user_id);
                  let newStatus;
                  if (statusIndex >= 0) {
                    newStatus = [...existingStatus];
                    newStatus[statusIndex] = { ...newStatus[statusIndex], delivered_at: statusUpdate.delivered_at, read_at: statusUpdate.read_at };
                  } else {
                    newStatus = [...existingStatus, { user_id: statusUpdate.user_id, delivered_at: statusUpdate.delivered_at, read_at: statusUpdate.read_at }];
                  }
                  return { ...msg, message_status: newStatus };
                }
                return msg;
              })
            );
          }
        }
      )
      .subscribe();

    // Subscribe to message reactions with optimistic updates
    const reactionsChannel = supabase
      .channel(`reactions-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          const newReaction = payload.new as { message_id: string; user_id: string; reaction: string };
          // Skip if current user's own reaction (already handled optimistically)
          if (newReaction.user_id === user?.id) return;
          
          setMessages(prev => prev.map(msg => {
            if (msg.id === newReaction.message_id) {
              const existingReactions = msg.message_reactions || [];
              // Prevent duplicates
              if (existingReactions.some(r => r.user_id === newReaction.user_id && r.reaction === newReaction.reaction)) {
                return msg;
              }
              return {
                ...msg,
                message_reactions: [...existingReactions, { user_id: newReaction.user_id, reaction: newReaction.reaction }]
              };
            }
            return msg;
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          const deletedReaction = payload.old as { message_id: string; user_id: string; reaction: string };
          // Skip if current user's own reaction (already handled optimistically)
          if (deletedReaction.user_id === user?.id) return;
          
          setMessages(prev => prev.map(msg => {
            if (msg.id === deletedReaction.message_id) {
              return {
                ...msg,
                message_reactions: (msg.message_reactions || []).filter(
                  r => !(r.user_id === deletedReaction.user_id && r.reaction === deletedReaction.reaction)
                )
              };
            }
            return msg;
          }));
        }
      )
      .subscribe();

    // Always refetch gifts when a gift is sent (even if realtime filters miss it)
    const onGiftSent = (event: Event) => {
      const custom = event as CustomEvent<{ chatId?: string }>;
      if (!custom.detail?.chatId || custom.detail.chatId !== chatId) return;
      fetchChatGifts();
    };
    window.addEventListener('chat-gift-sent', onGiftSent);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(envelopeChannel);
      supabase.removeChannel(giftChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(reactionsChannel);
      window.removeEventListener('chat-gift-sent', onGiftSent);
      stopRecording();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, user]);

  const fetchChatInfo = async () => {
    // Check for cached chat info first
    const cacheKey = `chat_info_${chatId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        setChatInfo(parsedCache.chatInfo);
        if (parsedCache.otherUser) setOtherUser(parsedCache.otherUser);
        if (parsedCache.isMember !== undefined) setIsMember(parsedCache.isMember);
        if (parsedCache.isGroupAdmin !== undefined) setIsGroupAdmin(parsedCache.isGroupAdmin);
      } catch (e) {
        console.error('Failed to parse cached chat info:', e);
      }
    }

    const { data } = await supabase
      .from('chats')
      .select('name, is_group, is_channel, description, avatar_url, created_by')
      .eq('id', chatId)
      .single();
    
    if (data) {
      setChatInfo(data);
      let cachedData: any = { chatInfo: data };
      
      // Check if current user is member and admin for groups
      if (data.is_group && user) {
        const { data: memberData } = await supabase
          .from('chat_members')
          .select('is_admin')
          .eq('chat_id', chatId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (memberData) {
          setIsMember(true);
          setIsGroupAdmin(memberData.is_admin || false);
          cachedData.isMember = true;
          cachedData.isGroupAdmin = memberData.is_admin || false;
        } else {
          setIsMember(false);
          setIsGroupAdmin(false);
          cachedData.isMember = false;
          cachedData.isGroupAdmin = false;
        }
      }
      
      // For 1-on-1 chats, fetch the other user's profile
      if (!data.is_group && user) {
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chatId)
          .neq('user_id', user.id)
          .limit(1);
        
        if (members && members.length > 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, handle, avatar_url, last_seen, show_online_status, is_verified, is_organization_verified, is_affiliate, affiliated_business_id, is_warned, warning_reason')
            .eq('id', members[0].user_id)
            .single();
          
          if (profile) {
            setOtherUser(profile);
            cachedData.otherUser = profile;
            // Check if user is online (last seen within 5 minutes)
            if (profile.last_seen && profile.show_online_status) {
              const lastSeenTime = new Date(profile.last_seen).getTime();
              const now = new Date().getTime();
              setOnline(now - lastSeenTime < 5 * 60 * 1000);
            }
          }
        }
      }

      // Cache the data for faster subsequent loads
      sessionStorage.setItem(cacheKey, JSON.stringify(cachedData));
    }
  };

  const fetchMessages = async () => {
    // Load cached messages for instant display
    const msgCacheKey = `chat_messages_${chatId}`;
    const cachedMessages = sessionStorage.getItem(msgCacheKey);
    if (cachedMessages) {
      try {
        const parsed = JSON.parse(cachedMessages);
        setMessages(parsed);
        setLoading(false); // Show cached data immediately
      } catch (e) {
        console.error('Failed to parse cached messages:', e);
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles(display_name, handle, avatar_url, is_verified, is_organization_verified, is_affiliate, affiliated_business_id, is_warned, warning_reason),
        message_reactions(reaction, user_id),
        message_status(read_at, delivered_at, user_id),
        reply_to_message:messages!reply_to_message_id(
          encrypted_content,
          audio_url,
          sender_id,
          profiles(display_name, avatar_url)
        )
      `)
      .eq('chat_id', chatId)
      .order('sent_at', { ascending: true });

    if (error) {
      toast.error('Failed to load messages');
      setLoading(false);
      return;
    }
    if (data) {
      setMessages(data as unknown as Message[]);
      // Cache messages for faster subsequent loads (limit to last 50 for storage)
      const messagesToCache = data.slice(-50);
      sessionStorage.setItem(msgCacheKey, JSON.stringify(messagesToCache));
      
      // Mark messages as delivered and read (only for non-channels)
      if (user && !chatInfo?.is_channel) {
        const messageIds = data
          .filter((msg) => msg.sender_id !== user.id)
          .map((msg) => msg.id);
        
        if (messageIds.length > 0) {
          markMessagesAsRead(messageIds); // Don't await for faster load
        }
      }
      
      // For channels, record message views
      if (user && chatInfo?.is_channel) {
        const messageIds = data.map((msg) => msg.id);
        recordMessageViews(messageIds); // Don't await for faster load
      }
    }
    setLoading(false);
  };

  const recordMessageViews = async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;
    
    // Insert view records for each message (conflicts are ignored due to unique constraint)
    for (const messageId of messageIds) {
      await supabase
        .from('message_views')
        .upsert(
          {
            message_id: messageId,
            viewer_id: user.id,
          },
          { onConflict: 'message_id,viewer_id', ignoreDuplicates: true }
        );
    }
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    const now = new Date().toISOString();

    // Update message_status for read receipts
    for (const messageId of messageIds) {
      await supabase
        .from('message_status')
        .upsert(
          {
            message_id: messageId,
            user_id: user.id,
            delivered_at: now,
            read_at: now,
          },
          { onConflict: 'message_id,user_id' }
        );
    }
  };

  const fetchRedEnvelopes = async () => {
    // Fetch all red envelopes (including fully claimed ones) so they remain visible
    const { data } = await supabase
      .from('red_envelopes')
      .select(`
        *,
        sender:profiles!red_envelopes_sender_id_fkey(display_name, avatar_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) {
      setRedEnvelopes(data);
    }
  };

  const fetchChatGifts = async () => {
    const { data } = await supabase
      .from('gift_transactions')
      .select(`
        *,
        sender:profiles!gift_transactions_sender_id_fkey(display_name, avatar_url),
        receiver:profiles!gift_transactions_receiver_id_fkey(display_name, avatar_url),
        gift:gifts!gift_transactions_gift_id_fkey(name, emoji, rarity, description)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) {
      setChatGifts(data);
    }
  };

  const getSupportedMimeType = () => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
    ];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'audio/webm';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      setRecordedMimeType(mimeType.split(';')[0]); // Store the base mime type
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const baseMimeType = mimeType.split(';')[0];
        const blob = new Blob(chunks, { type: baseMimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // Clear recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    // Stop ongoing recording
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
    
    // Stop the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Stop preview audio
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setIsPreviewPlaying(false);
    }
    
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const togglePreviewAudio = () => {
    if (!audioBlob) return;
    
    if (previewAudio && isPreviewPlaying) {
      previewAudio.pause();
      setIsPreviewPlaying(false);
    } else {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => {
        setIsPreviewPlaying(false);
      };
      audio.play();
      setPreviewAudio(audio);
      setIsPreviewPlaying(true);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileExtension = (mimeType: string): string => {
    const extensionMap: { [key: string]: string } = {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
    };
    return extensionMap[mimeType] || 'webm';
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !user || !chatId) return;

    setUploading(true);
    try {
      // Use correct file extension based on recorded mime type
      const fileExt = getFileExtension(recordedMimeType);
      const fileName = `${user.id}/voice-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, { 
          contentType: recordedMimeType,
          upsert: false 
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(data.path);

      const { data: inserted, error: insertError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          encrypted_content: '[Voice Message]',
          audio_url: publicUrl,
        })
        .select('*, profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, affiliated_business_id)')
        .single();

      if (insertError) throw insertError;

      // Add optimistic update with empty status (sent but not delivered)
      if (inserted) {
        const newMsg = {
          ...inserted,
          message_status: [],
          message_reactions: [],
        } as Message;
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      setAudioBlob(null);
      toast.success('Voice message sent');
    } catch (err) {
      toast.error('Failed to send voice message');
    }
    setUploading(false);
  };

  const toggleAudio = async (messageId: string, audioUrl: string) => {
    const current = audioPlayers[messageId];
    
    if (current?.isPlaying) {
      current.audio?.pause();
      setAudioPlayers((prev) => ({ ...prev, [messageId]: { ...current, isPlaying: false } }));
      return;
    }
    
    // Stop any other playing audio first
    Object.entries(audioPlayers).forEach(([id, player]) => {
      if (player.isPlaying && player.audio) {
        player.audio.pause();
        setAudioPlayers((prev) => ({ ...prev, [id]: { ...prev[id], isPlaying: false } }));
      }
    });
    
    try {
      // Check if URL is a storage path (not a full URL)
      let finalUrl = audioUrl;
      if (!audioUrl.startsWith('http')) {
        const { data } = supabase.storage.from('voice-messages').getPublicUrl(audioUrl);
        finalUrl = data.publicUrl;
      }
      
      const audio = new Audio(finalUrl);
      
      audio.onloadedmetadata = () => {
        setAudioPlayers((prev) => ({ 
          ...prev, 
          [messageId]: { ...prev[messageId], duration: audio.duration } 
        }));
      };
      
      audio.ontimeupdate = () => {
        setAudioPlayers((prev) => ({ 
          ...prev, 
          [messageId]: { ...prev[messageId], currentTime: audio.currentTime } 
        }));
      };
      
      audio.onerror = () => {
        console.error('Audio playback error for URL:', finalUrl);
        toast.error('Could not play audio');
        setAudioPlayers((prev) => ({ ...prev, [messageId]: { audio: null, isPlaying: false } }));
      };
      
      audio.onended = () => {
        setAudioPlayers((prev) => ({ 
          ...prev, 
          [messageId]: { ...prev[messageId], isPlaying: false, currentTime: 0 } 
        }));
      };
      
      setAudioPlayers((prev) => ({ ...prev, [messageId]: { audio, isPlaying: true, duration: prev[messageId]?.duration, currentTime: 0 } }));
      await audio.play();
    } catch (error) {
      console.error('Audio play error:', error);
      toast.error('Could not play audio');
      setAudioPlayers((prev) => ({ ...prev, [messageId]: { audio: null, isPlaying: false } }));
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !user || sending) return;

    try {
      if (newMessage.trim()) {
        messageSchema.parse(newMessage);
      }
    } catch (error) {
      toast.error('Message is too long or invalid');
      return;
    }

    // Content moderation - check for blocked links
    const contentError = checkContentAllowed(newMessage);
    if (contentError) {
      toast.error(contentError, { duration: 5000 });
      return;
    }

    setSending(true);
    
    try {
      let attachmentUrl = null;
      let attachmentType = null;
      let attachmentName = null;
      let attachmentSize = null;

      // Upload file if selected
      if (selectedFile) {
        setUploadingFile(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          toast.error('Failed to upload file');
          setSending(false);
          setUploadingFile(false);
          return;
        }

        attachmentUrl = fileName;
        attachmentType = selectedFile.type;
        attachmentName = selectedFile.name;
        attachmentSize = selectedFile.size;
        setUploadingFile(false);
      }

      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          encrypted_content: newMessage || '',
          reply_to_message_id: replyToMessage?.id || null,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_name: attachmentName,
          attachment_size: attachmentSize,
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to send message');
      } else {
        // Message sent - status entries will be created when recipients receive/view
        // Add optimistic update with the message having empty status (sent but not delivered)
        const newMsg = {
          ...inserted,
          profiles: {
            display_name: currentUserDisplayNameRef.current || 'You',
            handle: '',
            avatar_url: null,
            is_verified: false,
            is_organization_verified: false,
            is_affiliate: false,
            affiliated_business_id: null,
          },
          message_status: [],
          message_reactions: [],
          // Include reply data for optimistic update so quote shows immediately
          reply_to_message: replyToMessage ? [{
            encrypted_content: replyToMessage.encrypted_content,
            audio_url: replyToMessage.audio_url || null,
            sender_id: replyToMessage.sender_id,
            profiles: replyToMessage.profiles,
          }] : [],
        } as Message;
        
        setMessages((prev) => {
          // Check if message already exists (from real-time)
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        
        // Check if @AfuAI was mentioned in groups/channels (premium feature)
        const afuAIMentioned = /@afuai/i.test(newMessage);
        if (afuAIMentioned && (chatInfo?.is_group || chatInfo?.is_channel)) {
          triggerAfuAIReply(newMessage);
        }
        
        setNewMessage('');
        setSelectedFile(null);
        setReplyToMessage(null);
        removeTypingIndicator();
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
    
    setSending(false);
  };

  // Trigger AfuAI reply in groups/channels
  const triggerAfuAIReply = async (userMessage: string) => {
    if (!chatId || !user) return;
    
    setAfuAIProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('afuai-group-reply', {
        body: {
          message: userMessage,
          chatId: chatId,
        }
      });

      if (error) {
        // Check for premium requirement
        if (error.message?.includes('Premium') || error.message?.includes('403')) {
          toast.error('Premium subscription required to use @AfuAI in groups/channels');
          return;
        }
        throw error;
      }

      if (data?.reply) {
        // Insert AfuAI's reply as a message
        // We need an AfuAI system user ID - for now we'll use a special format
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            sender_id: user.id, // The user who triggered it
            encrypted_content: `🤖 **AfuAI:** ${data.reply}`,
          });

        if (insertError) {
          console.error('Failed to insert AfuAI reply:', insertError);
        }
      }
    } catch (error) {
      console.error('AfuAI reply error:', error);
      toast.error('Failed to get AfuAI response');
    } finally {
      setAfuAIProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not supported');
      return;
    }

    setSelectedFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle GIF selection from GIF picker
  const handleGifSelect = async (gifUrl: string) => {
    if (!user || !chatId || sending) return;
    
    setSending(true);
    
    try {
      // Send the GIF as a message with attachment URL pointing to the external GIF
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          encrypted_content: '',
          attachment_url: gifUrl,
          attachment_type: 'image/gif',
          attachment_name: 'GIF',
        });

      if (error) {
        toast.error('Failed to send GIF');
      }
    } catch (error) {
      toast.error('Failed to send GIF');
    }
    
    setSending(false);
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    
    if (value.trim()) {
      updateTypingIndicator();
    } else {
      removeTypingIndicator();
    }
  };

  const updateTypingIndicator = () => {
    if (!user || !chatId || !presenceChannel || !currentUserDisplayNameRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    presenceChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        display_name: currentUserDisplayNameRef.current,
      },
    });

    typingTimeoutRef.current = setTimeout(removeTypingIndicator, 3000);
  };

  const removeTypingIndicator = () => {
    if (!user || !chatId || !presenceChannel || !currentUserDisplayNameRef.current) return;

    presenceChannel.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: {
        user_id: user.id,
        display_name: currentUserDisplayNameRef.current,
      },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user) return;

    try {
      messageSchema.parse(newContent);

      const { error } = await supabase
        .from('messages')
        .update({ 
          encrypted_content: newContent,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, encrypted_content: newContent, edited_at: new Date().toISOString() }
          : msg
      ));

      toast.success('Message edited');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        toast.error('Message is too long or invalid');
      } else {
        toast.error('Failed to edit message');
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    // Check if user already has this reaction
    const existingReaction = messages.find(m => m.id === messageId)
      ?.message_reactions?.find(r => r.user_id === user.id && r.reaction === emoji);

    if (existingReaction) {
      // Remove the reaction
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction', emoji);

      if (!error) {
        // Optimistically update UI
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              message_reactions: msg.message_reactions?.filter(
                r => !(r.user_id === user.id && r.reaction === emoji)
              )
            };
          }
          return msg;
        }));
      }
    } else {
      // Add the reaction
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction: emoji,
        });

      if (!error) {
        // Optimistically update UI
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              message_reactions: [
                ...(msg.message_reactions || []),
                { reaction: emoji, user_id: user.id }
              ]
            };
          }
          return msg;
        }));
      }
    }
  };

  const handleReply = (message: Message) => {
    setReplyToMessage(message);
  };

  const handleBack = () => {
    navigate('/chats');
  };

  const handleJoinGroup = async () => {
    if (!user || !chatId) return;
    
    setIsJoining(true);
    try {
      // Use RPC to handle rejoin with admin rights restoration for creators
      const { data: isCreator, error } = await supabase
        .rpc('rejoin_group_with_admin_check', {
          _user_id: user.id,
          _chat_id: chatId
        });

      if (error) throw error;

      toast.success(t('chat.joinedGroup'));
      setIsMember(true);
      
      // If user is the original creator, they get admin back
      if (isCreator) {
        setIsGroupAdmin(true);
      }
      
      // Refresh chat info
      await fetchChatInfo();
    } catch (error) {
      toast.error(t('chat.joinGroupError'));
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !chatId || !chatInfo?.is_group) return;
    
    try {
      const { error } = await supabase
        .from('chat_members')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('chat.leftGroup'));
      navigate('/chats');
    } catch (error) {
      toast.error(t('chat.leaveGroupError'));
    }
  };

  const handleDeleteChat = async () => {
    if (!user || !chatId || chatInfo?.is_group) return;
    
    if (!window.confirm('Delete this chat? This will permanently remove the conversation for both you and the other user.')) {
      return;
    }
    
    try {
      const { error } = await supabase.rpc('delete_chat_for_both', {
        p_chat_id: chatId
      });

      if (error) throw error;

      toast.success('Chat deleted');
      navigate('/chats');
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      toast.error(error?.message || 'Failed to delete chat');
    }
  };

  const handleMuteChat = async () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'Chat unmuted' : 'Chat muted');
  };


  const handleSearchMessages = () => {
    setIsSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = messages.filter(msg => 
        msg.encrypted_content.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearHistory = async (deleteForBoth: boolean) => {
    if (!user || !chatId) return;
    
    try {
      if (deleteForBoth) {
        // Delete all messages for both sides
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('chat_id', chatId);

        if (error) throw error;
      } else {
        // Only delete messages sent by current user
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('chat_id', chatId)
          .eq('sender_id', user.id);

        if (error) throw error;
      }

      if (deleteForBoth) {
        setMessages([]);
      } else {
        setMessages(prev => prev.filter(m => m.sender_id !== user.id));
      }
      toast.success('Chat history cleared');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  // Check if user can clear history (only for 1-1 chats or groups they own)
  const canClearHistory = chatInfo && (
    !chatInfo.is_group || 
    chatInfo.created_by === user?.id
  );

  if (loading) {
    return (
      <ChatRoomSkeleton 
        isEmbedded={isEmbedded} 
        onBack={() => navigate('/chats')} 
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex flex-col bg-background ${isEmbedded ? 'h-full relative' : 'fixed inset-0'}`} style={{ overflow: 'hidden' }}>
        {/* Search Overlay */}
        {isSearchOpen && (
          <div className="absolute inset-x-0 top-0 z-20 bg-background border-b border-border px-3 py-3 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted/50"
                onClick={handleCloseSearch}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search messages..."
                  className="h-10 pl-10 pr-4 rounded-full bg-muted border-0"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            {searchQuery && (
              <div className="mt-3 max-h-64 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(msg => (
                      <div 
                        key={msg.id} 
                        className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                        onClick={() => {
                          handleCloseSearch();
                          // Scroll to message (would need message refs for exact scroll)
                          const msgElement = document.querySelector(`[data-message-id="${msg.id}"]`);
                          msgElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {msg.profiles?.display_name} • {new Date(msg.sent_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm line-clamp-2">{msg.encrypted_content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No messages found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* X-style Header - Clean and minimal */}
        <header className="flex-shrink-0 flex items-center gap-3 px-3 py-3 bg-background border-b border-border z-10 pt-[env(safe-area-inset-top)]">
          {!isEmbedded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-muted/50"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div 
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              if (chatInfo?.is_group) {
                setIsGroupSettingsOpen(true);
              } else if (otherUser) {
                navigate(`/${otherUser.handle}`);
              }
            }}
          >
            <UserAvatar 
              userId={chatInfo?.is_group ? chatId! : (otherUser?.id || 'unknown')}
              avatarUrl={chatInfo?.is_group ? chatInfo.avatar_url : otherUser?.avatar_url} 
              name={chatInfo?.is_group ? (chatInfo.name || 'Group') : (otherUser?.display_name || 'Chat')} 
              size={40}
              enableLightbox={true}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="font-bold text-base truncate">
                  {chatInfo?.is_group ? (chatInfo.name || 'Group') : (otherUser?.display_name || 'Chat')}
                </h2>
                {otherUser && !chatInfo?.is_group && otherUser.is_warned && (
                  <WarningBadge size="sm" reason={otherUser.warning_reason} variant="post" />
                )}
                {otherUser && !chatInfo?.is_group && (
                  <VerifiedBadge
                    isVerified={otherUser.is_verified || false}
                    isOrgVerified={otherUser.is_organization_verified || false}
                    isAffiliate={otherUser.is_affiliate || false}
                    size="sm"
                  />
                )}
              </div>
              {/* Last seen / Online status / Typing */}
              {!chatInfo?.is_group && otherUser && (
                <p className="text-xs text-muted-foreground truncate">
                  {typingUsers.length > 0 ? (
                    <span className="text-primary">typing...</span>
                  ) : online ? (
                    <span className="text-green-500">online</span>
                  ) : otherUser.show_online_status !== false && otherUser.last_seen ? (
                    `last seen ${formatLastSeen(otherUser.last_seen)}`
                  ) : (
                    `@${otherUser.handle}`
                  )}
                </p>
              )}
              {chatInfo?.is_group && (
                <p className="text-xs text-muted-foreground">
                  {typingUsers.length > 0 ? (
                    <span className="text-primary">{typingUsers[0]} is typing...</span>
                  ) : (
                    'Tap for group info'
                  )}
                </p>
              )}
            </div>
          </div>

          {chatInfo?.is_group && isGroupAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-muted/50"
              onClick={() => setIsGroupSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
          
        {/* Dropdown menu for groups (leave) or 1-on-1 chats (delete) - Telegram style */}
          {(chatInfo?.is_group && isMember) || (!chatInfo?.is_group && otherUser) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-muted/50"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <DropdownMenuItem 
                  className="gap-3 py-3 cursor-pointer"
                  onClick={handleMuteChat}
                >
                  {isMuted ? (
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </DropdownMenuItem>
                
                
                <DropdownMenuItem 
                  className="gap-3 py-3 cursor-pointer"
                  onClick={handleSearchMessages}
                >
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <span>Search</span>
                </DropdownMenuItem>
                
                
                {canClearHistory && (
                  <DropdownMenuItem 
                    className="gap-3 py-3 cursor-pointer"
                    onClick={() => setIsClearHistoryOpen(true)}
                  >
                    <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                    <span>Clear History</span>
                  </DropdownMenuItem>
                )}
                
                {chatInfo?.is_group ? (
                  <DropdownMenuItem 
                    onClick={handleLeaveGroup}
                    className="gap-3 py-3 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Delete and Exit</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={handleDeleteChat}
                    className="gap-3 py-3 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Delete Chat</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </header>

        {/* Messages container - only this scrolls */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 bg-background" 
          style={{ fontSize: `${chatPreferences.fontSize}px` }}
        >
          {messages.length === 0 && redEnvelopes.length === 0 && chatGifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 px-4">
              <MessageSquare className="h-14 w-14 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground/80">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <>
              {/* Display messages, red envelopes, and gifts chronologically */}
              {(() => {
                const sortedItems = [
                  ...messages,
                  ...redEnvelopes.map(e => ({ ...e, type: 'red_envelope' as const })),
                  ...chatGifts.map(g => ({ ...g, type: 'chat_gift' as const }))
                ].sort((a, b) => {
                  const timeA = 'sent_at' in a ? new Date(a.sent_at).getTime() : new Date(a.created_at).getTime();
                  const timeB = 'sent_at' in b ? new Date(b.sent_at).getTime() : new Date(b.created_at).getTime();
                  return timeA - timeB;
                });

                const itemsWithDividers = sortedItems.reduce((acc: any[], item, index) => {
                  const currentDate = 'sent_at' in item ? new Date(item.sent_at) : new Date(item.created_at);
                  const prevDate = index > 0 
                    ? ('sent_at' in sortedItems[index - 1] ? new Date((sortedItems[index - 1] as Message).sent_at) : new Date((sortedItems[index - 1] as any).created_at))
                    : null;

                  if (!prevDate || !isSameDay(currentDate, prevDate)) {
                    acc.push({ type: 'date_divider', date: currentDate });
                  }
                  acc.push(item);
                  return acc;
                }, []);

                return itemsWithDividers.map((item: any, index: number) => {
                  if (item.type === 'date_divider') {
                    return <DateDivider key={`date-${index}`} date={item.date} />;
                  }
                  
                  if (item.type === 'red_envelope') {
                    return (
                      <ChatRedEnvelope
                        key={item.id}
                        envelope={item}
                        onClaim={() => {
                          toast.success('Red envelope claimed!');
                          fetchRedEnvelopes();
                        }}
                      />
                    );
                  }

                  if (item.type === 'chat_gift') {
                    return (
                      <ChatGift
                        key={item.id}
                        gift={item}
                        isOwn={item.sender_id === user?.id}
                      />
                    );
                  }

                  const message = item as Message;
                  const isOwn = message.sender_id === user?.id;
                  
                  // Look back to find previous message from same sender
                  let prevMessage: Message | null = null;
                  for (let i = index - 1; i >= 0; i--) {
                    if (itemsWithDividers[i].type !== 'red_envelope' && itemsWithDividers[i].type !== 'date_divider' && 'sender_id' in itemsWithDividers[i]) {
                      prevMessage = itemsWithDividers[i] as Message;
                      break;
                    }
                  }
                  const isGrouped = prevMessage?.sender_id === message.sender_id;

                  // Look forward to find next message to determine if this is last in group
                  let nextMessage: Message | null = null;
                  for (let i = index + 1; i < itemsWithDividers.length; i++) {
                    if (itemsWithDividers[i].type !== 'red_envelope' && itemsWithDividers[i].type !== 'date_divider' && 'sender_id' in itemsWithDividers[i]) {
                      nextMessage = itemsWithDividers[i] as Message;
                      break;
                    }
                  }
                  const isLastInGroup = nextMessage?.sender_id !== message.sender_id;

                  return (
                    <div key={message.id} data-message-id={message.id}>
                      <MessageBubble
                        message={message}
                        isOwn={isOwn}
                        isGrouped={isGrouped}
                        isLastInGroup={isLastInGroup}
                        isOnline={online}
                        onReply={handleReply}
                        onReaction={handleReaction}
                        onToggleAudio={() => message.audio_url && toggleAudio(message.id, message.audio_url)}
                        audioPlayerState={audioPlayers[message.id] || { isPlaying: false }}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                        bubbleStyle={chatPreferences.bubbleStyle as 'rounded' | 'square' | 'minimal'}
                        showReadReceipts={chatPreferences.readReceipts}
                        fontSize={chatPreferences.fontSize}
                        isChannel={chatInfo?.is_channel || false}
                        viewCount={message.view_count || 0}
                      />
                    </div>
                  );
                });
              })()}
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <TypingIndicator userName={typingUsers[0]} />
              )}
            </>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Reply Preview - positioned above input */}
        {isMember && replyToMessage && !selectedFile && (
          <div className="flex-shrink-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-1 h-10 bg-primary rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary truncate">
                  Replying to {replyToMessage.profiles?.display_name || 'User'}
                </p>
                <p className="text-sm text-foreground/80 truncate mt-0.5">
                  {replyToMessage.audio_url ? '🎤 Voice message' : replyToMessage.encrypted_content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted flex-shrink-0"
                onClick={() => setReplyToMessage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* File Upload Preview */}
        {isMember && selectedFile && (
          <FileUploadPreview
            file={selectedFile}
            onRemove={() => setSelectedFile(null)}
          />
        )}

        {/* Join Group Button for Non-Members */}
        {chatInfo?.is_group && !isMember && (
          <div className="flex-shrink-0 bg-card border-t border-border px-4 py-4 pb-[env(safe-area-inset-bottom)]">
            <Button
              onClick={handleJoinGroup}
              disabled={isJoining}
              className="w-full h-12 rounded-xl font-semibold"
            >
              {isJoining ? t('chat.joining') : t('chat.joinGroup')}
            </Button>
          </div>
        )}

        {/* Input: X-style - Fixed at bottom */}
        {/* For channels, only admins can send messages */}
        {isMember && (!chatInfo?.is_channel || isGroupAdmin) && (
          <div className="flex-shrink-0 bg-background border-t border-border px-3 py-3 pb-[env(safe-area-inset-bottom)]">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,image/gif,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              {recording ? (
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-destructive/10 rounded-full border border-destructive/20">
                  <div className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                  <span className="text-sm text-destructive font-semibold tabular-nums">
                    {formatRecordingTime(recordingTime)}
                  </span>
                  <span className="text-sm text-destructive/80 flex-1">Recording...</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 text-destructive"
                    onClick={cancelRecording}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    onClick={stopRecording}
                  >
                    <MicOff className="h-4 w-4" />
                  </Button>
                </div>
              ) : audioBlob ? (
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-primary/10 rounded-full border border-primary/20">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                    onClick={togglePreviewAudio}
                  >
                    {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="text-sm text-primary font-medium tabular-nums">
                    {formatRecordingTime(recordingTime)}
                  </span>
                  <div className="flex-1 h-1 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-primary rounded-full" />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 text-destructive"
                    onClick={cancelRecording}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={sendVoiceMessage}
                    disabled={uploading}
                  >
                    {uploading ? <Send className="h-4 w-4 opacity-50" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Plus button for attachments */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-muted/50 flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-5 w-5 text-foreground" />
                  </Button>

                  {/* GIF button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-muted/50 flex-shrink-0"
                    onClick={() => setIsGifPickerOpen(true)}
                  >
                    <span className="text-xs font-bold text-foreground">GIF</span>
                  </Button>


                  {/* Gift button - only for 1-on-1 chats */}
                  {!chatInfo?.is_group && !chatInfo?.is_channel && otherUser && (
                    <SendGiftDialog
                      receiverId={otherUser.id}
                      receiverName={otherUser.display_name}
                      chatId={chatId}
                      onGiftSent={fetchChatGifts}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full hover:bg-muted/50 flex-shrink-0"
                        >
                          <Gift className="h-5 w-5 text-primary" />
                        </Button>
                      }
                    />
                  )}

                  {/* Red Envelope button - only for groups */}
                  {chatInfo?.is_group && !chatInfo?.is_channel && (
                    <SendRedEnvelopeDialog
                      chatId={chatId!}
                      onSuccess={fetchRedEnvelopes}
                    />
                  )}
                  
                  {/* Message input */}
                  <div className="flex-1 bg-muted/50 rounded-2xl flex items-end px-4 py-2 min-h-[44px]">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => {
                        handleInputChange(e.target.value);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                          // Reset height after sending
                          if (textareaRef.current) {
                            textareaRef.current.style.height = 'auto';
                          }
                        }
                      }}
                      placeholder={selectedFile ? 'Add a caption...' : 'Message'}
                      className="flex-1 bg-transparent border-none text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-0 resize-none min-h-[28px] max-h-[120px] py-1 leading-relaxed"
                      disabled={sending}
                      rows={1}
                    />
                  </div>
                  
                  {/* Send or Mic button */}
                  {(newMessage.trim() || selectedFile) ? (
                    <Button
                      type="submit"
                      size="icon"
                      className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                      disabled={sending || uploadingFile}
                    >
                      {(sending || uploadingFile) ? <Send className="h-4 w-4 opacity-50" /> : <Send className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full hover:bg-muted/50 text-foreground flex-shrink-0"
                      onClick={startRecording}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </>
              )}
            </form>
          </div>
        )}

        {/* Channel subscriber notice */}
        {isMember && chatInfo?.is_channel && !isGroupAdmin && (
          <div className="flex-shrink-0 bg-muted/50 border-t border-border px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground">Only channel admins can send messages</p>
          </div>
        )}
      </div>

      {/* Clear History Dialog */}
      <ClearHistoryDialog
        open={isClearHistoryOpen}
        onOpenChange={setIsClearHistoryOpen}
        onConfirm={handleClearHistory}
        isOneOnOne={!chatInfo?.is_group}
      />

      {/* Group Settings Sheet */}
      {chatInfo?.is_group && (
        <GroupSettingsSheet
          isOpen={isGroupSettingsOpen}
          onClose={() => setIsGroupSettingsOpen(false)}
          chatId={chatId!}
          isAdmin={isGroupAdmin}
        />
      )}

      {/* GIF Picker */}
      <GifPicker
        open={isGifPickerOpen}
        onOpenChange={setIsGifPickerOpen}
        onSelect={handleGifSelect}
      />
    </TooltipProvider>
  );
};

export default ChatRoom;
