import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAITranslation } from '@/hooks/useAITranslation';
import { ThumbsUp, MessageCircle, Pin, Trash2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WarningBadge } from '@/components/WarningBadge';

interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  parent_reply_id?: string | null;
  is_pinned?: boolean;
  pinned_by?: string | null;
  pinned_at?: string | null;
  nested_replies?: Reply[];
  likes_count?: number;
  profiles: {
    display_name: string;
    handle: string;
    is_verified: boolean;
    is_organization_verified: boolean;
    avatar_url?: string | null;
    last_seen?: string | null;
    show_online_status?: boolean;
    is_warned?: boolean;
    warning_reason?: string | null;
  };
}

interface FeedNestedReplyItemProps {
  reply: Reply;
  depth: number;
  handleViewProfile: (id: string) => void;
  onReplyToReply: (parentReplyId: string, content: string) => void;
  onPinReply: (replyId: string, currentPinnedState: boolean) => void;
  onDeleteReply: (replyId: string) => void;
  isPostAuthor: boolean;
  currentUserId?: string;
  parsePostContent: (content: string, navigate: any) => React.ReactNode;
  formatTime: (time: string) => string;
  UserAvatarSmall: React.ComponentType<{
    userId: string;
    name: string;
    avatarUrl?: string | null;
    lastSeen?: string | null;
    showOnlineStatus?: boolean;
  }>;
  VerifiedBadge: React.ComponentType<{
    isVerified: boolean;
    isOrgVerified: boolean;
  }>;
}

// Generate consistent color based on user ID
const getAvatarRingColor = (userId: string) => {
  const colors = [
    'ring-blue-500',
    'ring-pink-500',
    'ring-purple-500',
    'ring-emerald-500',
    'ring-orange-500',
    'ring-cyan-500',
    'ring-rose-500',
    'ring-indigo-500',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getAvatarBgColor = (userId: string) => {
  const colors = [
    'bg-blue-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-indigo-500',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const FeedNestedReplyItem = ({
  reply,
  depth,
  handleViewProfile,
  onReplyToReply,
  onPinReply,
  onDeleteReply,
  isPostAuthor,
  currentUserId,
  parsePostContent,
  formatTime,
  UserAvatarSmall,
  VerifiedBadge,
}: FeedNestedReplyItemProps) => {
  const { i18n, t } = useTranslation();
  const { translateText } = useAITranslation();
  const navigate = useNavigate();
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reply.likes_count || 0);

  const handleTranslate = async () => {
    if (translatedContent) {
      setTranslatedContent(null);
      return;
    }
    setIsTranslating(true);
    const contentToTranslate = typeof reply.content === 'string' ? reply.content : String(reply.content || '');
    const translated = await translateText(contentToTranslate, i18n.language);
    setTranslatedContent(translated);
    setIsTranslating(false);
  };

  const handleReplySubmit = () => {
    if (replyText.trim()) {
      onReplyToReply(reply.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  };

  const displayContent = translatedContent || (typeof reply.content === 'string' ? reply.content : String(reply.content || ''));
  const ringColor = getAvatarRingColor(reply.author_id);
  const bgColor = getAvatarBgColor(reply.author_id);
  const hasNestedReplies = reply.nested_replies && reply.nested_replies.length > 0;

  return (
    <div className="relative">
      {/* Curved thread line connecting to parent */}
      {depth > 0 && (
        <svg
          className="absolute left-0 top-0 pointer-events-none"
          width="32"
          height="40"
          style={{ transform: 'translate(-32px, -8px)' }}
        >
          <path
            d="M 16 0 L 16 20 Q 16 32 28 32 L 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
        </svg>
      )}

      {/* Pinned indicator */}
      {reply.is_pinned && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1 ml-12">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      
      <div className="flex gap-3 py-3">
        {/* Avatar with colorful ring */}
        <div className="relative flex-shrink-0">
          <div
            className="cursor-pointer"
            onClick={() => handleViewProfile(reply.author_id)}
          >
            <Avatar className={cn("h-10 w-10 ring-2 ring-offset-2 ring-offset-background", ringColor)}>
              <AvatarImage src={reply.profiles.avatar_url || undefined} />
              <AvatarFallback className={cn("text-white font-semibold", bgColor)}>
                {reply.profiles.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Vertical line to nested replies */}
          {hasNestedReplies && (
            <div 
              className="absolute left-1/2 top-12 w-0.5 bg-border -translate-x-1/2"
              style={{ height: 'calc(100% - 32px)' }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold text-foreground cursor-pointer hover:underline"
              onClick={() => handleViewProfile(reply.author_id)}
            >
              {reply.profiles.display_name}
            </span>
            <VerifiedBadge 
              isVerified={reply.profiles.is_verified} 
              isOrgVerified={reply.profiles.is_organization_verified} 
            />
            {reply.profiles.is_warned && (
              <WarningBadge size="sm" reason={reply.profiles.warning_reason} variant="post" />
            )}
            <span className="text-muted-foreground text-sm">
              {formatTime(reply.created_at)}
            </span>
          </div>

          {/* Content */}
          <div className="text-foreground text-[15px] leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {parsePostContent(displayContent, navigate)}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 mt-2">
            {/* Like button */}
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                liked ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
            
            {/* Reply button */}
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Reply
            </button>
            
            {/* Translate button */}
            {i18n.language !== 'en' && (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {isTranslating ? t('common.translating') : translatedContent ? t('common.showOriginal') : t('common.translate')}
              </button>
            )}
            
            {/* Pin button */}
            {isPostAuthor && depth === 0 && (
              <button
                onClick={() => onPinReply(reply.id, reply.is_pinned || false)}
                className={cn(
                  "text-sm transition-colors",
                  reply.is_pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {reply.is_pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
            
            {/* Delete button */}
            {currentUserId && (currentUserId === reply.author_id || isPostAuthor) && (
              <button
                onClick={() => {
                  if (confirm('Delete this reply?')) {
                    onDeleteReply(reply.id);
                  }
                }}
                className="text-muted-foreground hover:text-destructive text-sm transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-3 flex items-start gap-3 pt-3 border-t border-border/30">
              <Avatar className="h-8 w-8 ring-2 ring-primary ring-offset-2 ring-offset-background">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  Y
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                  }}
                  onKeyDown={(e) => {
                    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
                    if (e.key === 'Enter' && !e.shiftKey && !isMobileDevice) {
                      e.preventDefault();
                      handleReplySubmit();
                    }
                  }}
                  placeholder={`Reply to @${reply.profiles.handle}...`}
                  className="w-full bg-muted/50 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none overflow-hidden min-h-[40px]"
                  style={{ maxHeight: '100px' }}
                  rows={1}
                  autoFocus
                />
                <div className="flex justify-end mt-2 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowReplyInput(false)}
                    className="rounded-full px-4 h-8 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim()}
                    className="rounded-full px-4 h-8 text-sm font-semibold"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {hasNestedReplies && (
        <div className="ml-12 relative">
          {reply.nested_replies!.map((nestedReply, index) => (
            <FeedNestedReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              depth={depth + 1}
              handleViewProfile={handleViewProfile}
              onReplyToReply={onReplyToReply}
              onPinReply={onPinReply}
              onDeleteReply={onDeleteReply}
              isPostAuthor={isPostAuthor}
              currentUserId={currentUserId}
              parsePostContent={parsePostContent}
              formatTime={formatTime}
              UserAvatarSmall={UserAvatarSmall}
              VerifiedBadge={VerifiedBadge}
            />
          ))}
        </div>
      )}
    </div>
  );
};