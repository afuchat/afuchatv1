import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Users, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatListSkeleton } from '@/components/chat/ChatListSkeleton';
import NewChatDialog from '@/components/ui/NewChatDialog';
import { CreateGroupDialog } from '@/components/chat/CreateGroupDialog';
import { CreateChannelDialog } from '@/components/chat/CreateChannelDialog';
import ChatFloatingActionButton from '@/components/chat/ChatFloatingActionButton';

import { toast } from 'sonner';
import { ChatSettingsSheet } from '@/components/chat/ChatSettingsSheet';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { WarningBadge } from '@/components/WarningBadge';
import { Input } from '@/components/ui/input';
import { ChatStoriesHeader } from '@/components/chat/ChatStoriesHeader';

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  is_channel?: boolean;
  is_verified?: boolean;
  updated_at: string;
  last_message_content?: string;
  unread_count?: number;
  avatar_url?: string | null;
  description?: string | null;
  other_user?: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    is_verified: boolean | null;
    is_organization_verified: boolean | null;
    is_warned?: boolean | null;
    warning_reason?: string | null;
    is_business_mode?: boolean | null;
  };
  is_muted?: boolean;
  is_pinned?: boolean;
  is_read?: boolean;
  last_message_sent_by_me?: boolean;
  last_message_read_by_receiver?: boolean;
}

const formatTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);
  
  // Same day - show nothing special, just date
  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '');
  }
  
  // Format as "Mon DD" style
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
};

type FilterTab = 'all' | 'unread' | 'groups' | 'requests';

interface ChatsProps {
  isEmbedded?: boolean;
}

const Chats = ({ isEmbedded = false }: ChatsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFab, setShowFab] = useState(true);
  const [isStoriesExpanded, setIsStoriesExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    avatar_url: string | null;
    display_name: string;
  } | null>(null);

  const filteredChats = chats
    .filter((chat) => {
      // First apply tab filter
      if (activeTab === 'unread' && (!chat.unread_count || chat.unread_count === 0)) return false;
      if (activeTab === 'groups' && !chat.is_group) return false;
      // 'requests' tab would show message requests - for now show nothing
      if (activeTab === 'requests') return false;
      
      // Then apply search filter
      if (!searchQuery.trim()) return true;
      const chatName = chat.is_group 
        ? (chat.name || 'Group Chat')
        : (chat.other_user?.display_name || 'User');
      const lastMessage = chat.last_message_content || '';
      return (
        chatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    // Always sort by most recent first
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', user.id)
        .single();
      if (data) setCurrentUserProfile(data);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchChats = async (isInitial = true) => {
      if (isInitial) {
        const cachedChats = sessionStorage.getItem('cachedChats');
        if (cachedChats) {
          try {
            setChats(JSON.parse(cachedChats));
            setLoading(false);
          } catch (e) {
            console.error('Failed to parse cached chats:', e);
          }
        }
      }
      
      try {
        const BATCH_SIZE = 30;
        const offset = isInitial ? 0 : chats.length;

        const { data: chatMembers, error } = await supabase
          .from('chat_members')
          .select(`
            chat_id,
            chats!inner(
              id, 
              name, 
              is_group,
              is_channel,
              is_verified,
              avatar_url,
              description,
              updated_at,
              chat_members!inner(
                user_id,
                profiles(id, display_name, handle, avatar_url, is_verified, is_organization_verified, is_warned, warning_reason, is_business_mode)
              )
            )
          `)
          .eq('user_id', user.id)
          .order('updated_at', { foreignTable: 'chats', ascending: false })
          .range(offset, offset + BATCH_SIZE - 1);

        if (error) throw error;

        if (!chatMembers || chatMembers.length === 0) {
          setHasMore(false);
          if (isInitial) setChats([]);
          return;
        }

        if (chatMembers.length < BATCH_SIZE) setHasMore(false);

        const chatIds = chatMembers.map(m => m.chats.id);

        const [allMessages, allUnreadCounts] = await Promise.all([
          supabase
            .from('messages')
            .select(`
              chat_id, 
              encrypted_content, 
              attachment_type, 
              audio_url, 
              sent_at, 
              sender_id,
              message_status!left(read_at, user_id)
            `)
            .in('chat_id', chatIds)
            .order('sent_at', { ascending: false }),
          // Check message_status for read receipts instead of messages.read_at
          supabase
            .from('messages')
            .select(`
              chat_id, 
              id,
              message_status!left(read_at, user_id)
            `)
            .in('chat_id', chatIds)
            .neq('sender_id', user.id)
        ]);

        const messagesByChat = new Map<string, any>();
        allMessages.data?.forEach(msg => {
          if (!messagesByChat.has(msg.chat_id)) {
            messagesByChat.set(msg.chat_id, msg);
          }
        });

        const unreadByChat = new Map<string, number>();
        allUnreadCounts.data?.forEach(msg => {
          // Check if current user has read status for this message
          const userReadStatus = msg.message_status?.find((s: any) => s.user_id === user.id);
          const isUnread = !userReadStatus || !userReadStatus.read_at;
          if (isUnread) {
            unreadByChat.set(msg.chat_id, (unreadByChat.get(msg.chat_id) || 0) + 1);
          }
        });

        const validChats: Chat[] = [];
        chatMembers.forEach((member) => {
          const chatId = member.chats.id;
          const chatMemb = member.chats.chat_members || [];

          if (chatMemb.length === 2) {
            const memberIds = chatMemb.map((m: any) => m.user_id);
            if (memberIds[0] === memberIds[1]) return;
          }

          const lastMessage = messagesByChat.get(chatId);
          const unreadCount = unreadByChat.get(chatId) || 0;

          // Check if last message was sent by current user and read by receiver
          const lastMessageSentByMe = lastMessage?.sender_id === user.id;
          let lastMessageReadByReceiver = false;
          
          if (lastMessageSentByMe && lastMessage?.message_status) {
            // Check if any other user has read the message
            const otherUserReadStatus = lastMessage.message_status.find(
              (s: any) => s.user_id !== user.id && s.read_at
            );
            lastMessageReadByReceiver = !!otherUserReadStatus;
          }

          let chatData: Chat = {
            ...member.chats,
            last_message_content: '',
            updated_at: lastMessage?.sent_at || member.chats.updated_at,
            is_read: lastMessage ? (lastMessage.sender_id === user.id || !!lastMessage.read_at) : true,
            unread_count: unreadCount,
            last_message_sent_by_me: lastMessageSentByMe,
            last_message_read_by_receiver: lastMessageReadByReceiver
          };

          if (lastMessage) {
            if (lastMessage.audio_url) {
              chatData.last_message_content = '🎤 Voice message';
            } else if (lastMessage.attachment_type?.startsWith('image/')) {
              chatData.last_message_content = '📷 Photo';
            } else if (lastMessage.attachment_type) {
              chatData.last_message_content = '📎 Attachment';
            } else {
              chatData.last_message_content = lastMessage.encrypted_content || 'Message';
            }
          }

          if (!member.chats.is_group) {
            const otherMember = chatMemb.find((m: any) => m.user_id !== user.id);
            if (otherMember?.profiles) {
              chatData.other_user = {
                id: otherMember.profiles.id,
                display_name: otherMember.profiles.display_name,
                handle: otherMember.profiles.handle,
                avatar_url: otherMember.profiles.avatar_url,
                is_verified: otherMember.profiles.is_verified,
                is_organization_verified: otherMember.profiles.is_organization_verified,
                is_warned: otherMember.profiles.is_warned,
                warning_reason: otherMember.profiles.warning_reason
              };
            }
          }

          validChats.push(chatData);
        });

        validChats.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
        if (isInitial) {
          setChats(validChats);
          sessionStorage.setItem('cachedChats', JSON.stringify(validChats));
        } else {
          setChats(prev => [...prev, ...validChats]);
        }
      } catch (err) {
        console.error('Error fetching chats:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchChats(true);

    const channel = supabase
      .channel('chat-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        fetchChats(true);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        if (payload.new.read_at && !payload.old.read_at) {
          fetchChats(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Trigger fetch when loadingMore becomes true
  useEffect(() => {
    if (!loadingMore || !user || !hasMore) return;
    
    const fetchMoreChats = async () => {
      try {
        const BATCH_SIZE = 30;
        const offset = chats.length;

        const { data: chatMembers, error } = await supabase
          .from('chat_members')
          .select(`
            chat_id,
            chats!inner(
              id, 
              name, 
              is_group,
              is_channel,
              is_verified,
              avatar_url,
              description,
              updated_at,
              chat_members!inner(
                user_id,
                profiles(id, display_name, handle, avatar_url, is_verified, is_organization_verified, is_warned, warning_reason, is_business_mode)
              )
            )
          `)
          .eq('user_id', user.id)
          .order('updated_at', { foreignTable: 'chats', ascending: false })
          .range(offset, offset + BATCH_SIZE - 1);

        if (error) throw error;

        if (!chatMembers || chatMembers.length === 0) {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }

        if (chatMembers.length < BATCH_SIZE) setHasMore(false);

        const chatIds = chatMembers.map(m => m.chats.id);

        const [allMessages, allUnreadCounts] = await Promise.all([
          supabase
            .from('messages')
            .select(`chat_id, encrypted_content, attachment_type, audio_url, sent_at, sender_id, message_status!left(read_at, user_id)`)
            .in('chat_id', chatIds)
            .order('sent_at', { ascending: false }),
          supabase
            .from('messages')
            .select(`chat_id, id, message_status!left(read_at, user_id)`)
            .in('chat_id', chatIds)
            .neq('sender_id', user.id)
        ]);

        const messagesByChat = new Map<string, any>();
        allMessages.data?.forEach(msg => {
          if (!messagesByChat.has(msg.chat_id)) {
            messagesByChat.set(msg.chat_id, msg);
          }
        });

        const unreadByChat = new Map<string, number>();
        allUnreadCounts.data?.forEach(msg => {
          const userReadStatus = msg.message_status?.find((s: any) => s.user_id === user.id);
          const isUnread = !userReadStatus || !userReadStatus.read_at;
          if (isUnread) {
            unreadByChat.set(msg.chat_id, (unreadByChat.get(msg.chat_id) || 0) + 1);
          }
        });

        const validChats: Chat[] = [];
        chatMembers.forEach((member) => {
          const chatId = member.chats.id;
          const chatMemb = member.chats.chat_members || [];

          if (chatMemb.length === 2) {
            const memberIds = chatMemb.map((m: any) => m.user_id);
            if (memberIds[0] === memberIds[1]) return;
          }

          const lastMessage = messagesByChat.get(chatId);
          const unreadCount = unreadByChat.get(chatId) || 0;
          const lastMessageSentByMe = lastMessage?.sender_id === user.id;
          let lastMessageReadByReceiver = false;
          
          if (lastMessageSentByMe && lastMessage?.message_status) {
            const otherUserReadStatus = lastMessage.message_status.find(
              (s: any) => s.user_id !== user.id && s.read_at
            );
            lastMessageReadByReceiver = !!otherUserReadStatus;
          }

          let chatData: Chat = {
            ...member.chats,
            last_message_content: '',
            updated_at: lastMessage?.sent_at || member.chats.updated_at,
            is_read: lastMessage ? (lastMessage.sender_id === user.id || !!lastMessage.read_at) : true,
            unread_count: unreadCount,
            last_message_sent_by_me: lastMessageSentByMe,
            last_message_read_by_receiver: lastMessageReadByReceiver
          };

          if (lastMessage) {
            if (lastMessage.audio_url) {
              chatData.last_message_content = '🎤 Voice message';
            } else if (lastMessage.attachment_type?.startsWith('image/')) {
              chatData.last_message_content = '📷 Photo';
            } else if (lastMessage.attachment_type) {
              chatData.last_message_content = '📎 Attachment';
            } else {
              chatData.last_message_content = lastMessage.encrypted_content || 'Message';
            }
          }

          if (!member.chats.is_group) {
            const otherMember = chatMemb.find((m: any) => m.user_id !== user.id);
            if (otherMember?.profiles) {
              chatData.other_user = {
                id: otherMember.profiles.id,
                display_name: otherMember.profiles.display_name,
                handle: otherMember.profiles.handle,
                avatar_url: otherMember.profiles.avatar_url,
                is_verified: otherMember.profiles.is_verified,
                is_organization_verified: otherMember.profiles.is_organization_verified,
                is_warned: otherMember.profiles.is_warned,
                warning_reason: otherMember.profiles.warning_reason
              };
            }
          }

          validChats.push(chatData);
        });

        validChats.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setChats(prev => [...prev, ...validChats]);
      } catch (err) {
        console.error('Error fetching more chats:', err);
      } finally {
        setLoadingMore(false);
      }
    };

    fetchMoreChats();
  }, [loadingMore, user, hasMore, chats.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      
      const scrollElement = scrollRef.current;
      const currentScrollY = scrollElement.scrollTop;
      const scrollingDown = currentScrollY > lastScrollY.current;

      if (currentScrollY < 10) {
        setShowFab(true);
      } else if (scrollingDown && currentScrollY > 50) {
        setShowFab(false);
        setIsStoriesExpanded(false);
      } else if (!scrollingDown) {
        setShowFab(true);
      }

      const scrollHeight = scrollElement.scrollHeight;
      const clientHeight = scrollElement.clientHeight;
      const isNearBottom = scrollHeight - currentScrollY - clientHeight < 200;
      
      if (isNearBottom && hasMore && !loadingMore && !loading) {
        setLoadingMore(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasMore, loadingMore, loading]);

  if (loading && chats.length === 0) {
    return (
      <div className={`flex flex-col bg-background relative overflow-hidden ${isEmbedded ? 'h-full' : 'h-full min-h-screen'}`}>
        <ChatListSkeleton />
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'groups', label: 'Groups' },
    { key: 'requests', label: 'Requests' },
  ];

  return (
    <div className={`flex flex-col bg-background relative overflow-hidden ${isEmbedded ? 'h-full' : 'h-full min-h-screen'}`}>
      {/* Stories Header */}
      <ChatStoriesHeader 
        isExpanded={isStoriesExpanded}
        onToggleExpand={() => setIsStoriesExpanded(!isStoriesExpanded)}
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Filter Tabs — Telegram pill style */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-background overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-[6px] rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat List */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin pb-20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-[15px] font-semibold text-foreground">
              {searchQuery ? 'No chats found' : activeTab === 'requests' ? 'No message requests' : 'No chats yet'}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[240px]">
              {searchQuery ? 'Try different keywords' : 'Start a new conversation to begin messaging.'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const chatName = chat.is_group 
              ? (chat.name || 'Group Chat')
              : (chat.other_user?.display_name || 'User');
            const handle = chat.is_group ? null : chat.other_user?.handle;
            const hasUnread = chat.unread_count && chat.unread_count > 0;
            
            return (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex items-center gap-3 px-4 py-[10px] hover:bg-muted/20 active:bg-muted/40 cursor-pointer transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                  {chat.is_group ? (
                    <div className="h-[52px] w-[52px] rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {chat.avatar_url ? (
                        <img 
                          src={chat.avatar_url} 
                          alt={chatName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  ) : (
                    <UserAvatar
                      userId={chat.other_user?.id || chat.id}
                      avatarUrl={chat.other_user?.avatar_url}
                      name={chatName}
                      size={52}
                      isBusiness={chat.other_user?.is_business_mode}
                      enableLightbox={true}
                    />
                  )}
                </div>

                {/* Chat info */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center justify-between gap-2 mb-[3px]">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className={`font-semibold text-[15px] truncate ${hasUnread ? 'text-foreground' : 'text-foreground'}`}>
                        {chatName}
                      </span>
                      {!chat.is_group && chat.other_user?.is_warned && (
                        <WarningBadge size="sm" reason={chat.other_user?.warning_reason} variant="post" />
                      )}
                      {chat.is_group && chat.is_verified && (
                        <VerifiedBadge isVerified={true} size="sm" />
                      )}
                      {!chat.is_group && (chat.other_user?.is_organization_verified || chat.other_user?.is_verified) && (
                        <VerifiedBadge 
                          isOrgVerified={chat.other_user?.is_organization_verified || false}
                          isVerified={chat.other_user?.is_verified || false}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Read status tick for sent messages */}
                      {!hasUnread && chat.last_message_sent_by_me && (
                        chat.last_message_read_by_receiver ? (
                          <CheckCheck className="h-[15px] w-[15px] text-primary" />
                        ) : (
                          <Check className="h-[15px] w-[15px] text-muted-foreground" />
                        )
                      )}
                      <span className={`text-[12px] ${hasUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {formatTime(chat.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[14px] truncate flex-1 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {chat.last_message_content || 'No messages yet'}
                    </p>
                    {hasUnread && (
                      <div className="min-w-[20px] h-5 px-[6px] rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-primary-foreground leading-none">
                          {chat.unread_count! > 99 ? '99+' : chat.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {loadingMore && (
          <div className="py-4">
            <ChatListSkeleton />
          </div>
        )}
      </div>

      <ChatFloatingActionButton
        onNewChat={() => setIsNewChatDialogOpen(true)}
        onCreateGroup={() => setIsCreateGroupDialogOpen(true)}
        onCreateChannel={() => setIsCreateChannelDialogOpen(true)}
        isVisible={showFab}
      />

      <NewChatDialog
        isOpen={isNewChatDialogOpen}
        onClose={() => setIsNewChatDialogOpen(false)}
      />

      <CreateGroupDialog
        isOpen={isCreateGroupDialogOpen}
        onClose={() => setIsCreateGroupDialogOpen(false)}
        onGroupCreated={(groupId) => {
          navigate(`/chat/${groupId}`);
          toast.success('Group created! Add members to get started.');
        }}
      />

      <CreateChannelDialog
        isOpen={isCreateChannelDialogOpen}
        onClose={() => setIsCreateChannelDialogOpen(false)}
        onChannelCreated={(channelId) => {
          navigate(`/chat/${channelId}`);
          toast.success('Channel created!');
        }}
      />

      <ChatSettingsSheet 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Chats;
