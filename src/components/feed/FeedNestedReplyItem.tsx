import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAITranslation } from '@/hooks/useAITranslation';
import { Heart, MessageCircle, BarChart2, Pin, Trash2 } from 'lucide-react';
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
  const replyCount = reply.reply_count || reply.nested_replies?.length || 0;
  const viewCount = reply.view_count || 0;
  
  // Check if we've reached max depth
  const atMaxDepth = depth >= maxDepth;

  return (
    <div className="relative">
      {/* Pinned indicator */}
      {reply.is_pinned && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1 ml-10">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      
      <div className="flex gap-2.5 py-2.5">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className="cursor-pointer"
            onClick={() => handleViewProfile(reply.author_id)}
          >
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={reply.profiles.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {reply.profiles.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="font-semibold text-foreground text-sm cursor-pointer hover:underline"
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
            <span className="text-muted-foreground text-xs">
              · {formatTime(reply.created_at)}
            </span>
          </div>

          {/* Content */}
          <div className="text-foreground text-sm leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
            {parsePostContent(displayContent, navigate)}
          </div>

          {/* Interactive action icons */}
          <div className="flex items-center gap-5 mt-2">
            {/* Like button */}
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors group",
                liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
            
            {/* Reply button */}
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {replyCount > 0 && <span>{replyCount}</span>}
            </button>
            
            {/* View count */}
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <BarChart2 className="h-4 w-4" />
              {viewCount > 0 && <span>{viewCount}</span>}
            </div>
            
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

      {/* Nested replies - limit to maxDepth */}
      {hasNestedReplies && !atMaxDepth && (
        <div className="ml-11 border-l border-border/40 pl-3">
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
          className="ml-11 mt-1 text-primary text-sm font-medium hover:underline block"
        >
          View {reply.nested_replies!.length} more {reply.nested_replies!.length === 1 ? 'reply' : 'replies'} →
        </Link>
      )}
    </div>
  );
};