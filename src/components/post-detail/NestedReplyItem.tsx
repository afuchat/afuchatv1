import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, BarChart2, Pin, Trash2 } from 'lucide-react';
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
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
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
  const replyCount = reply.reply_count || reply.nested_replies?.length || 0;
  const viewCount = reply.view_count || 0;

  return (
    <div className="relative">
      {/* Pinned indicator */}
      {reply.is_pinned && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1 ml-12">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      
      <div className="flex gap-3 py-3 px-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Link to={`/${reply.author.handle}`}>
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={reply.author.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {reply.author.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
            <Link 
              to={`/${reply.author.handle}`}
              className="text-muted-foreground text-sm hover:underline"
            >
              @{reply.author.handle}
            </Link>
            <span className="text-muted-foreground text-sm">· {formatTime(reply.created_at)}</span>
          </div>

          {/* Content */}
          <div className="text-foreground text-[15px] leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {renderContentWithMentions(translatedReplies[reply.id] || (typeof reply.content === 'string' ? reply.content : String(reply.content || '')))}
          </div>

          {/* Interactive action icons - like post interactions */}
          <div className="flex items-center gap-6 mt-3 pt-2">
            {/* Like button */}
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart className={cn("h-[18px] w-[18px]", liked && "fill-current")} />
              {likesCount > 0 && <span className="text-sm">{likesCount}</span>}
            </button>
            
            {/* Reply button */}
            <button
              onClick={handleReplyClick}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
              {replyCount > 0 && <span className="text-sm">{replyCount}</span>}
            </button>
            
            {/* View count */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart2 className="h-[18px] w-[18px]" />
              {viewCount > 0 && <span className="text-sm">{viewCount}</span>}
            </div>
            
            {/* Pin button */}
            {onPinReply && isPostAuthor && depth === 0 && (
              <button
                onClick={() => onPinReply(reply.id, reply.is_pinned || false)}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
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

      {/* Nested replies */}
      {hasNestedReplies && (
        <div className="ml-12 border-l border-border/40 pl-1">
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