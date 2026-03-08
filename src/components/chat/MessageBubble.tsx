import { motion } from 'framer-motion';
import { Check, CheckCheck, Play, Pause, Eye } from 'lucide-react';
import { AttachmentPreview } from './AttachmentPreview';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { MessageActionsMenu } from './MessageActionsMenu';
import { OrderNotificationActions } from '@/components/shop/OrderNotificationActions';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Helper function to parse message content with clickable links, mentions, and hashtags
const parseMessageContent = (content: string): React.ReactNode => {
  if (!content || typeof content !== 'string') return content;
  
  const combinedRegex = /(@[a-zA-Z0-9_-]+|#\w+|https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  const matches = Array.from(content.matchAll(combinedRegex));
  
  if (matches.length === 0) return content;
  
  matches.forEach((match, idx) => {
    const matchText = match[0];
    const index = match.index!;
    
    if (index > lastIndex) {
      parts.push(content.substring(lastIndex, index));
    }
    
    if (matchText.startsWith('@')) {
      const handle = matchText.substring(1);
      parts.push(
        <Link 
          key={`mention-${idx}`} 
          to={`/@${handle}`} 
          className="text-blue-300 hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {matchText}
        </Link>
      );
    } else if (matchText.startsWith('#')) {
      const hashtag = matchText.substring(1);
      parts.push(
        <Link
          key={`hashtag-${idx}`}
          to={`/search?q=${encodeURIComponent(hashtag)}`}
          className="text-blue-300 hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {matchText}
        </Link>
      );
    } else {
      // It's a URL (either with http/https or a plain domain)
      const url = matchText.startsWith('http') ? matchText : `https://${matchText}`;
      parts.push(
        <a
          key={`url-${idx}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {matchText.length > 40 ? matchText.substring(0, 40) + '...' : matchText}
        </a>
      );
    }
    
    lastIndex = index + matchText.length;
  });

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return <>{parts}</>;
};

export interface Reaction {
  reaction: string;
  user_id: string;
}

export interface Message {
  id: string;
  encrypted_content: string;
  audio_url?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  sender_id: string;
  sent_at: string;
  edited_at?: string | null;
  reply_to_message_id?: string | null;
  order_context?: {
    order_number?: string;
    order_id?: string;
    customer_id?: string;
    customer_name?: string;
    total?: number;
    type?: 'new_order' | 'cancellation' | 'refund_request' | 'status_update';
    payment_method?: string;
  } | null;
  message_reactions?: Reaction[];
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
    is_warned?: boolean | null;
    warning_reason?: string | null;
  };
  message_status?: Array<{
    read_at: string | null;
    delivered_at: string | null;
    user_id: string;
  }>;
}

// --- Helper to aggregate reactions ---
const aggregateReactions = (reactions: Reaction[]) => {
  if (!reactions || reactions.length === 0) return [];
  const counts = reactions.reduce((acc, reaction) => {
    acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  return Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
};

// --- Telegram-style reaction badge displayed inside message bubble ---
const ReactionsDisplay = ({ 
  reactions, 
  onReaction,
  messageId,
  currentUserId 
}: { 
  reactions: Reaction[]; 
  onReaction: (messageId: string, emoji: string) => void;
  messageId: string;
  currentUserId?: string;
}) => {
  const aggregated = aggregateReactions(reactions);
  if (aggregated.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 pb-1.5 pt-0.5">
      <div className="flex items-center bg-black/20 rounded-full px-2 py-0.5">
        {aggregated.map(({ emoji, count }) => {
          const hasUserReacted = currentUserId && reactions.some(
            r => r.reaction === emoji && r.user_id === currentUserId
          );
          return (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onReaction(messageId, emoji);
              }}
              className={`flex items-center text-base transition-transform hover:scale-110 ${
                hasUserReacted ? 'opacity-100' : 'opacity-90'
              }`}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-xs text-white/80 ml-0.5">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGrouped: boolean; // Is it part of a group of messages?
  isLastInGroup: boolean; // Is it the last message in a group?
  isOnline: boolean; // (Simulated)
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onToggleAudio: () => void;
  audioPlayerState: { isPlaying: boolean; duration?: number; currentTime?: number };
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  bubbleStyle?: 'rounded' | 'square' | 'minimal';
  showReadReceipts?: boolean;
  fontSize?: number;
  isChannel?: boolean;
  viewCount?: number;
  isGroup?: boolean;
}

export const MessageBubble = ({
  message,
  isOwn,
  isGrouped,
  isLastInGroup,
  isOnline,
  onReply,
  onReaction,
  onToggleAudio,
  audioPlayerState,
  onEdit,
  onDelete,
  bubbleStyle = 'rounded',
  showReadReceipts = true,
  fontSize = 16,
  isChannel = false,
  viewCount = 0,
  isGroup = false,
}: MessageBubbleProps) => {
  const { user } = useAuth();
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const time = new Date(message.sent_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const isVoice = !!message.audio_url;
  const hasAttachment = !!message.attachment_url;
  const hasOrderContext = !!message.order_context;
  
  // Check if current user is shop admin
  const isShopAdmin = user?.id === '629333cf-087e-4283-8a09-a44282dda98b';

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVoiceDownload = async (url: string) => {
    try {
      let blob: Blob;
      try {
        const response = await fetch(url, { mode: 'cors' });
        blob = await response.blob();
      } catch {
        // Fallback for CORS issues
        const a = document.createElement('a');
        a.href = url;
        a.download = `afuchat-voice-${Date.now()}.webm`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Opening audio for download...');
        return;
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `afuchat-voice-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast.success('Voice message downloaded!');
    } catch (error) {
      console.error('Voice download error:', error);
      toast.error('Download failed');
    }
  };
  
  // Check read/delivered status for own messages
  const hasStatus = message.message_status && message.message_status.length > 0;
  const allRead = hasStatus && message.message_status!.every(s => s.read_at);
  const anyDelivered = hasStatus && message.message_status!.some(s => s.delivered_at);
  
  // Check if message can be edited (within 15 minutes)
  const canEdit = isOwn && !isVoice && !hasAttachment && message.sent_at && 
    (Date.now() - new Date(message.sent_at).getTime()) < 15 * 60 * 1000;

  // Dynamic bubble border radius based on style
  const getBubbleRadius = () => {
    if (bubbleStyle === 'square') {
      // Square style - consistent rounded corners
      if (isLastInGroup) {
        return isOwn ? 'rounded-lg rounded-br-sm' : 'rounded-lg rounded-bl-sm';
      }
      return 'rounded-lg';
    }
    
    if (bubbleStyle === 'minimal') {
      // Minimal style - subtle corners
      if (isLastInGroup) {
        return isOwn ? 'rounded-md rounded-br-none' : 'rounded-md rounded-bl-none';
      }
      return 'rounded-md';
    }
    
    // Default rounded style - smooth, WhatsApp-like
    if (isLastInGroup) {
      return isOwn ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md';
    }
    return 'rounded-2xl';
  };

  // Swipe-to-reply gesture
  const handleDragEnd = (event: any, info: any) => {
    if (!isOwn && info.offset.x > 80) {
      onReply(message);
    } else if (isOwn && info.offset.x < -80) {
      onReply(message);
    }
  };

  const handleDownload = async () => {
    if (!message.attachment_url) return;
    
    try {
      let blob: Blob;
      const url = message.attachment_url;
      
      // Handle different URL types
      if (url.startsWith('data:')) {
        const response = await fetch(url);
        blob = await response.blob();
      } else if (url.startsWith('blob:')) {
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (!response.ok) throw new Error('Fetch failed');
          blob = await response.blob();
        } catch {
          // Fallback for CORS issues
          const a = document.createElement('a');
          a.href = url;
          a.download = message.attachment_name || 'afuchat-download';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success('Opening file for download...');
          return;
        }
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = message.attachment_name || `afuchat-download-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast.success('Downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  // Long press handlers for mobile - increased to 700ms to prevent accidental triggers
  const handleTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setActionsSheetOpen(true);
    }, 700);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setActionsSheetOpen(true);
  }, []);

  // Find the message being replied to (if any)
  // IMPORTANT: Only show quote if reply_to_message_id exists (Supabase join may return data even when null)
  const replyData = message.reply_to_message_id && Array.isArray(message.reply_to_message) && message.reply_to_message.length > 0
    ? message.reply_to_message[0] 
    : null;
  const repliedMessage = replyData?.encrypted_content ? replyData : null;


  const ReadStatus = () => {
    // For channels, show view count instead of read receipts
    if (isChannel) {
      return (
        <span className="flex items-center gap-0.5 text-[10px] opacity-70">
          <Eye className="h-3 w-3" />
          {viewCount > 0 ? viewCount : ''}
        </span>
      );
    }
    
    if (!isOwn || !showReadReceipts) return null;
    
    // No status entries yet = just sent (single gray check)
    if (!hasStatus) {
      return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    
    // All recipients have read = double colored check
    if (allRead) {
      return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
    }
    
    // At least one delivered = double gray check
    if (anyDelivered) {
      return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    
    // Has status but not delivered yet = single check
    return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const hasReactions = message.message_reactions && message.message_reactions.length > 0;

  return (
    <>
    <motion.div
      drag="x"
      dragConstraints={{ left: isOwn ? -60 : 0, right: isOwn ? 0 : 60 }}
      dragElastic={0.1}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'pan-y' }}
      className={`flex w-full ${
        isChannel ? 'justify-start' : (isOwn ? 'justify-end' : 'justify-start')
      } ${
        isLastInGroup ? 'mb-1' : 'mb-px'
      } ${isGroup && !isOwn ? 'items-end gap-2' : ''}`}
    >
      {/* Sender avatar in group chats only */}
      {isGroup && !isOwn && isLastInGroup && (
        <Link to={`/@${message.profiles.handle}`} className="flex-shrink-0 mb-0.5" onClick={(e) => e.stopPropagation()}>
          <UIAvatar className="h-7 w-7">
            <AvatarImage src={message.profiles.avatar_url || undefined} alt={message.profiles.display_name} />
            <AvatarFallback className="text-[10px]">
              {message.profiles.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </UIAvatar>
        </Link>
      )}
      {isGroup && !isOwn && !isLastInGroup && (
        <div className="w-7 flex-shrink-0" />
      )}
      <div className="flex flex-col max-w-[85%]">
        {/* Sender name in group chats */}
        {isGroup && !isOwn && !isGrouped && (
          <Link to={`/${message.profiles.handle}`} className="text-[11px] font-semibold text-primary ml-1 mb-0.5 hover:underline" onClick={(e) => e.stopPropagation()}>
            {message.profiles.display_name}
          </Link>
        )}
      <div
        className={`${
          isChannel
            ? 'bg-muted text-foreground'
            : isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
        } ${getBubbleRadius()} overflow-hidden`}
      >
        {repliedMessage && (
          <div className={`px-2 pt-1.5 pb-1 border-l-2 ${isOwn ? 'border-primary-foreground/50 bg-primary-foreground/10' : 'border-primary/50 bg-primary/10'} mx-1 mt-1 rounded-r`}>
            <p className="text-xs opacity-80 line-clamp-2">
              {repliedMessage.audio_url ? '🎤 Voice message' : repliedMessage.encrypted_content}
            </p>
          </div>
        )}
        {hasAttachment ? (
          <>
            <AttachmentPreview
              url={message.attachment_url!}
              type={message.attachment_type || ''}
              name={message.attachment_name || 'Attachment'}
              size={message.attachment_size}
              isOwn={isOwn}
              onDownload={handleDownload}
            />
            {message.encrypted_content && (
              <p className="px-2 py-1 leading-snug whitespace-pre-wrap break-words" style={{ fontSize: `${fontSize}px` }}>
                {parseMessageContent(message.encrypted_content)}
              </p>
            )}
            <div className="flex items-center gap-0.5 px-2 pb-1 justify-end">
              <span className="text-[10px] opacity-70">{time}</span>
              <ReadStatus />
            </div>
          </>
        ) : isVoice ? (
          <div className="px-2 py-2">
            <div className="flex items-center gap-3">
              {/* Large circular play button */}
              <button
                onClick={onToggleAudio}
                className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${
                  isOwn 
                    ? 'bg-primary-foreground text-primary' 
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {audioPlayerState?.isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </button>
              
              {/* Waveform and duration */}
              <div className="flex-1 min-w-[100px]">
                {/* Animated waveform bars */}
                <div className="flex items-center gap-[2px] h-6 mb-1">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const progress = audioPlayerState?.duration 
                      ? ((audioPlayerState.currentTime || 0) / audioPlayerState.duration) * 100 
                      : 0;
                    const barProgress = (i / 28) * 100;
                    const isPlayed = barProgress < progress;
                    const isPlaying = audioPlayerState?.isPlaying;
                    // Generate pseudo-random heights for waveform effect
                    const baseHeights = [60, 80, 45, 90, 55, 75, 40, 85, 65, 50, 70, 95, 55, 80, 45, 70, 60, 85, 50, 75, 65, 90, 55, 70, 80, 45, 60, 75];
                    const baseHeight = baseHeights[i % baseHeights.length];
                    
                    return (
                      <div
                        key={i}
                        className={`w-[3px] rounded-full origin-center ${
                          isPlayed 
                            ? isOwn ? 'bg-primary-foreground' : 'bg-primary'
                            : isOwn ? 'bg-primary-foreground/40' : 'bg-foreground/30'
                        } ${isPlaying ? 'waveform-bar-animate' : ''}`}
                        style={{ 
                          height: `${baseHeight}%`,
                          animationDelay: `${(i % 7) * 70}ms`
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* Duration - shows current time / total duration */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium tabular-nums ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {formatAudioTime(audioPlayerState?.currentTime || 0)}
                    {audioPlayerState?.duration ? ` / ${formatAudioTime(audioPlayerState.duration)}` : ''}
                  </span>
                  {audioPlayerState?.isPlaying && (
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOwn ? 'bg-primary-foreground' : 'bg-primary'}`} />
                  )}
                </div>
              </div>
            </div>
            
            {/* Timestamp and read status */}
            <div className="flex items-center gap-0.5 justify-end mt-1">
              <span className="text-[10px] opacity-70">{time}</span>
              <ReadStatus />
            </div>
          </div>
        ) : (
          <div className="px-2 py-1">
            <span className="leading-snug whitespace-pre-wrap break-words" style={{ fontSize: `${fontSize}px` }}>
              {parseMessageContent(message.encrypted_content.replace(/\[ACTION_BUTTONS:[^\]]+\]/g, ''))}
            </span>
            {hasOrderContext && message.order_context && (
              <OrderNotificationActions 
                orderContext={message.order_context}
                isAdmin={isShopAdmin}
              />
            )}
            <span className="inline-flex items-center gap-0.5 ml-1.5 align-bottom float-right translate-y-0.5">
              <span className="text-[10px] opacity-70">{time}</span>
              <ReadStatus />
            </span>
          </div>
          )}
        
        {/* Telegram-style Reactions Display - inside bubble */}
        {hasReactions && (
          <ReactionsDisplay
            reactions={message.message_reactions!}
            onReaction={onReaction}
            messageId={message.id}
            currentUserId={user?.id}
          />
        )}
      </div>
      </div>
    </motion.div>

    <MessageActionsMenu
      open={actionsSheetOpen}
      onOpenChange={setActionsSheetOpen}
      message={message}
      isOwn={isOwn}
      onReply={() => onReply(message)}
      onReaction={(emoji) => onReaction(message.id, emoji)}
      onEdit={(newContent) => onEdit?.(message.id, newContent)}
      onDelete={() => onDelete?.(message.id)}
    />
    </>
  );
};
