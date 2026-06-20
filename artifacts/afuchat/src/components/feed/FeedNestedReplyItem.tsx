import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAITranslation } from '@/hooks/useAITranslation';
import { Pin, Trash2 } from 'lucide-react';
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
  reply_count?: number;
  view_count?: number;
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
  maxDepth?: number;
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

// Layout constants (px)
const INDENT_PX = 44; // indentation per reply level
const AVATAR_PX = 36; // h-9


export const FeedNestedReplyItem = ({
  reply,
  depth,
  maxDepth = 3,
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
  const hasNestedReplies = reply.nested_replies && reply.nested_replies.length > 0;

  // Check if we've reached max depth
  const atMaxDepth = depth >= maxDepth;

  // Calculate left margin based on depth (for nesting visual)
  const nestingMargin = depth * INDENT_PX;


  return (
    <div className="relative">
      {/* Pinned indicator */}
      {reply.is_pinned && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1" style={{ marginLeft: nestingMargin + 14 }}>
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      
      {/* Curved connector line - connects parent avatar to child avatar */}
      {depth > 0 && (
        <svg
          className="absolute text-muted-foreground/50"
          style={{ 
            left: nestingMargin - 26,
            top: -16,
            width: 32,
            height: 52,
            pointerEvents: 'none'
          }}
          viewBox="0 0 32 52"
          fill="none"
        >
          <path
            d="M8 0 L8 36 Q8 44 16 44 L32 44"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )}
      
      <div className="flex gap-3 py-2.5" style={{ marginLeft: nestingMargin }}>

        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className="cursor-pointer"
            onClick={() => handleViewProfile(reply.author_id)}
          >
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={reply.profiles.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                {reply.profiles.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="font-bold text-foreground cursor-pointer hover:underline"
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
          <div className="text-foreground text-sm leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
            {parsePostContent(displayContent, navigate)}
          </div>

          {/* Interactive action icons - ThumbsUp style */}
          <div className="flex items-center gap-5 mt-2">
            {/* Like button - ThumbsUp style */}
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                liked ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <svg 
                viewBox="0 0 24 24" 
                className={cn("h-4 w-4", liked && "fill-current")}
                fill={liked ? "currentColor" : "none"}
                stroke="currentColor" 
                strokeWidth="1.5"
              >
                <path d="M7 22V11M2 13V20C2 21.1 2.9 22 4 22H17.4C18.1 22 18.7 21.6 19 21L21.9 14C22 13.7 22 13.3 21.9 13C21.8 12.7 21.5 12.4 21.2 12.2C20.9 12.1 20.6 12 20.3 12H14L15.3 6.5C15.4 6.1 15.3 5.7 15.1 5.3C14.9 5 14.5 4.7 14 4.6C13.7 4.5 13.3 4.5 13 4.7C12.7 4.8 12.5 5.1 12.3 5.4L7 11" />
              </svg>
              {likesCount > 0 && <span className="text-sm">{likesCount}</span>}
            </button>
            
            {/* Reply button */}
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              Reply
            </button>
            
            {/* Delete button - only show for author or post owner */}
            {currentUserId && (currentUserId === reply.author_id || isPostAuthor) && (
              <button
                onClick={() => {
                  if (confirm('Delete this reply?')) {
                    onDeleteReply(reply.id);
                  }
                }}
                className="text-muted-foreground hover:text-destructive text-xs transition-colors ml-auto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-2.5 flex items-start gap-2 pt-2.5 border-t border-border/30">
              <Avatar className="h-7 w-7 border border-border">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
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
                  className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none overflow-hidden min-h-[36px]"
                  style={{ maxHeight: '100px' }}
                  rows={1}
                  autoFocus
                />
                <div className="flex justify-end mt-2 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowReplyInput(false)}
                    className="rounded-full px-3 h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim()}
                    className="rounded-full px-3 h-7 text-xs font-semibold"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies - NO long vertical lines, just individual curved connectors */}
      {hasNestedReplies && !atMaxDepth && (
        <div>
          {reply.nested_replies!.map((nestedReply) => (
            <FeedNestedReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              depth={depth + 1}
              maxDepth={maxDepth}
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
      
      {/* Show "View more replies" link when at max depth */}
      {hasNestedReplies && atMaxDepth && (
        <Link 
          to={`/post/${reply.post_id}`}
          className="text-primary text-sm font-medium hover:underline block mt-1"
          style={{ marginLeft: nestingMargin + 52 }}
        >
          View {reply.nested_replies!.length} more {reply.nested_replies!.length === 1 ? 'reply' : 'replies'} →
        </Link>
      )}
    </div>
  );
};
