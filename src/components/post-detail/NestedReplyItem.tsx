import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentInput } from '@/components/feed/CommentInput';
import { WarningBadge } from '@/components/WarningBadge';
import React from 'react';

interface Reply {
  id: string;
  content: string;
  created_at: string;
  parent_reply_id: string | null;
  is_pinned?: boolean;
  pinned_by?: string | null;
  pinned_at?: string | null;
  likes_count?: number;
  reply_count?: number;
  view_count?: number;
  author: {
    display_name: string;
    handle: string;
    is_verified: boolean;
    is_organization_verified: boolean;
    avatar_url: string | null;
    is_warned?: boolean;
    warning_reason?: string | null;
    id?: string;
  };
  nested_replies?: Reply[];
}

interface NestedReplyItemProps {
  reply: Reply;
  postId: string;
  depth?: number;
  onTranslate: (replyId: string, content: string) => void;
  translatedReplies: { [key: string]: string };
  onReplyClick: (replyId: string, authorHandle: string) => void;
  onPinReply?: (replyId: string, currentPinnedState: boolean) => void;
  onDeleteReply?: (replyId: string) => void;
  isPostAuthor?: boolean;
  currentUserId?: string;
  VerifiedBadge: React.ComponentType<{ isVerified?: boolean; isOrgVerified?: boolean }>;
  renderContentWithMentions: (content: string) => React.ReactNode;
  onCommentSubmitted?: () => void;
}

// Layout constants (px)
const INDENT_PX = 48; // indentation per reply level
const AVATAR_PX = 40; // h-10


export const NestedReplyItem = ({
  reply,
  postId,
  depth = 0,
  onTranslate,
  translatedReplies,
  onReplyClick,
  onPinReply,
  onDeleteReply,
  isPostAuthor,
  currentUserId,
  VerifiedBadge,
  renderContentWithMentions,
  onCommentSubmitted,
}: NestedReplyItemProps) => {
  const { t, i18n } = useTranslation();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reply.likes_count || 0);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleReplyClick = () => {
    setShowReplyInput(!showReplyInput);
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  };

  const hasNestedReplies = reply.nested_replies && reply.nested_replies.length > 0;

  // Calculate left margin based on depth (for nesting visual)
  const nestingMargin = depth * INDENT_PX;


  return (
    <div className="relative">
      {/* Pinned indicator */}
      {reply.is_pinned && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1" style={{ marginLeft: nestingMargin + 16 }}>
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      
      {/* Curved connector line - connects parent avatar to child avatar */}
      {depth > 0 && (
        <svg
          className="absolute text-muted-foreground/50"
          style={{ 
            left: nestingMargin - 28,
            top: -16,
            width: 32,
            height: 56,
            pointerEvents: 'none'
          }}
          viewBox="0 0 32 56"
          fill="none"
        >
          <path
            d="M8 0 L8 40 Q8 48 16 48 L32 48"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )}
      
      <div className="flex gap-3 py-3 px-4" style={{ marginLeft: nestingMargin }}>

        {/* Avatar */}
        <div className="flex-shrink-0">
          <Link to={`/@${reply.author.handle}`}>
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={reply.author.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                {reply.author.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link 
              to={`/@${reply.author.handle}`} 
              className="font-bold text-foreground hover:underline"
            >
              {reply.author.display_name}
            </Link>
            <VerifiedBadge 
              isVerified={reply.author.is_verified} 
              isOrgVerified={reply.author.is_organization_verified} 
            />
            {reply.author.is_warned && (
              <WarningBadge size="sm" reason={reply.author.warning_reason} variant="post" />
            )}
            <span className="text-muted-foreground text-sm">{formatTime(reply.created_at)}</span>
          </div>

          {/* Content */}
          <div className="text-foreground text-[15px] leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {renderContentWithMentions(translatedReplies[reply.id] || (typeof reply.content === 'string' ? reply.content : String(reply.content || '')))}
          </div>

          {/* Interactive action icons - ThumbsUp style */}
          <div className="flex items-center gap-6 mt-2.5">
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
                className={cn("h-[18px] w-[18px]", liked && "fill-current")}
                fill={liked ? "currentColor" : "none"}
                stroke="currentColor" 
                strokeWidth="1.5"
              >
                <path d="M7 22V11M2 13V20C2 21.1 2.9 22 4 22H17.4C18.1 22 18.7 21.6 19 21L21.9 14C22 13.7 22 13.3 21.9 13C21.8 12.7 21.5 12.4 21.2 12.2C20.9 12.1 20.6 12 20.3 12H14L15.3 6.5C15.4 6.1 15.3 5.7 15.1 5.3C14.9 5 14.5 4.7 14 4.6C13.7 4.5 13.3 4.5 13 4.7C12.7 4.8 12.5 5.1 12.3 5.4L7 11" />
              </svg>
              {likesCount > 0 && <span className="text-sm font-medium">{likesCount}</span>}
            </button>
            
            {/* Reply button */}
            <button
              onClick={handleReplyClick}
              className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
            >
              Reply
            </button>
            
            {/* Pin button */}
            {onPinReply && isPostAuthor && depth === 0 && (
              <button
                onClick={() => onPinReply(reply.id, reply.is_pinned || false)}
                className={cn(
                  "transition-colors",
                  reply.is_pinned ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Pin className="h-[18px] w-[18px]" />
              </button>
            )}
            
            {/* Delete button */}
            {onDeleteReply && currentUserId && (currentUserId === reply.author.handle || isPostAuthor) && (
              <button
                onClick={() => {
                  if (confirm('Delete this reply?')) {
                    onDeleteReply(reply.id);
                  }
                }}
                className="text-muted-foreground hover:text-destructive transition-colors ml-auto"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          {/* Inline Reply Input */}
          {showReplyInput && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <CommentInput
                postId={postId}
                replyingTo={{ replyId: reply.id, authorHandle: reply.author.handle }}
                onCancelReply={() => setShowReplyInput(false)}
                onCommentSubmitted={() => {
                  setShowReplyInput(false);
                  onCommentSubmitted?.();
                }}
                compact
                autoFocus
                className="border-0 px-0 py-0 bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested replies - NO long vertical lines, just individual curved connectors */}
      {hasNestedReplies && (
        <div>
          {reply.nested_replies!.map(nestedReply => (
            <NestedReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              postId={postId}
              depth={depth + 1}
              onTranslate={onTranslate}
              translatedReplies={translatedReplies}
              onReplyClick={onReplyClick}
              onPinReply={onPinReply}
              onDeleteReply={onDeleteReply}
              isPostAuthor={isPostAuthor}
              currentUserId={currentUserId}
              VerifiedBadge={VerifiedBadge}
              renderContentWithMentions={renderContentWithMentions}
              onCommentSubmitted={onCommentSubmitted}
            />
          ))}
        </div>
      )}
    </div>
  );
};
