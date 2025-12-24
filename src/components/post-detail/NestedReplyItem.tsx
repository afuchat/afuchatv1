import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, Pin, Trash2 } from 'lucide-react';
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

// Generate consistent color based on handle
const getAvatarRingColor = (handle: string) => {
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
  const hash = handle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getAvatarBgColor = (handle: string) => {
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
  const hash = handle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

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

  const ringColor = getAvatarRingColor(reply.author.handle);
  const bgColor = getAvatarBgColor(reply.author.handle);
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
          <Link to={`/${reply.author.handle}`}>
            <Avatar className={cn("h-10 w-10 ring-2 ring-offset-2 ring-offset-background", ringColor)}>
              <AvatarImage src={reply.author.avatar_url || undefined} />
              <AvatarFallback className={cn("text-white font-semibold", bgColor)}>
                {reply.author.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
          
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
            <Link 
              to={`/${reply.author.handle}`} 
              className="font-semibold text-foreground hover:underline"
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
            <span className="text-muted-foreground text-sm">
              {formatTime(reply.created_at)}
            </span>
          </div>

          {/* Content */}
          <div className="text-foreground text-[15px] leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {renderContentWithMentions(translatedReplies[reply.id] || (typeof reply.content === 'string' ? reply.content : String(reply.content || '')))}
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
              onClick={handleReplyClick}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Reply
            </button>
            
            {/* Translate button */}
            {i18n.language !== 'en' && (
              <button
                onClick={() => onTranslate(reply.id, reply.content)}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {translatedReplies[reply.id] ? t('common.showOriginal') : t('common.translate')}
              </button>
            )}
            
            {/* Pin button */}
            {onPinReply && isPostAuthor && depth === 0 && (
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
            {onDeleteReply && currentUserId && (currentUserId === reply.author.handle || isPostAuthor) && (
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

      {/* Nested replies */}
      {hasNestedReplies && (
        <div className="ml-12 relative">
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