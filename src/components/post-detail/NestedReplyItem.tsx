import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Pin, Trash2, MoreHorizontal } from 'lucide-react';
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
  author: {
    display_name: string;
    handle: string;
    is_verified: boolean;
    is_organization_verified: boolean;
    avatar_url: string | null;
    is_warned?: boolean;
    warning_reason?: string | null;
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleReplyClick = () => {
    setShowReplyInput(!showReplyInput);
  };

  return (
    <div className="relative">
      {/* Pinned indicator */}
      {reply.is_pinned && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium mb-1 ml-[52px]">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      
      <div className="flex gap-3 py-2">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Link to={`/${reply.author.handle}`}>
            <Avatar className="h-8 w-8 border border-border/50">
              <AvatarImage src={reply.author.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                {reply.author.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row - Twitter style */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              <Link 
                to={`/${reply.author.handle}`} 
                className="font-bold text-foreground text-[15px] hover:underline truncate"
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
                className="text-muted-foreground text-[15px] hover:underline truncate"
              >
                @{reply.author.handle}
              </Link>
              <span className="text-muted-foreground text-[15px]">·</span>
              <span className="text-muted-foreground text-[15px] hover:underline cursor-pointer">
                {formatTime(reply.created_at)}
              </span>
            </div>
            
            {/* More actions button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Reply content */}
          <div className="text-foreground text-[15px] leading-[1.4] whitespace-pre-wrap break-words mt-0.5">
            {renderContentWithMentions(translatedReplies[reply.id] || (typeof reply.content === 'string' ? reply.content : String(reply.content || '')))}
          </div>

          {/* Action buttons - Twitter style */}
          <div className="flex items-center gap-1 mt-3 -ml-2">
            {/* Reply button - always available, no depth limit */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReplyClick}
              className="h-8 px-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full gap-1.5 group"
            >
              <MessageCircle className="h-[18px] w-[18px] group-hover:text-primary" />
              <span className="text-[13px]">Reply</span>
            </Button>
            
            {/* Translate button */}
            {i18n.language !== 'en' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTranslate(reply.id, reply.content)}
                className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full text-[13px]"
              >
                {translatedReplies[reply.id] ? t('common.showOriginal') : t('common.translate')}
              </Button>
            )}
            
            {/* Pin button - only for post author on top-level replies */}
            {onPinReply && isPostAuthor && depth === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPinReply(reply.id, reply.is_pinned || false)}
                className={cn(
                  "h-8 px-3 rounded-full gap-1.5",
                  reply.is_pinned 
                    ? "text-primary hover:text-primary hover:bg-primary/10" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                <Pin className="h-[18px] w-[18px]" />
                <span className="text-[13px]">{reply.is_pinned ? 'Unpin' : 'Pin'}</span>
              </Button>
            )}
            
            {/* Delete button */}
            {onDeleteReply && currentUserId && (currentUserId === reply.author.handle || isPostAuthor) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this reply?')) {
                    onDeleteReply(reply.id);
                  }
                }}
                className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full gap-1.5"
              >
                <Trash2 className="h-[18px] w-[18px]" />
                <span className="text-[13px]">Delete</span>
              </Button>
            )}
          </div>

          {/* Inline Reply Input - Twitter style */}
          {showReplyInput && (
            <div className="mt-3 pt-3 border-t border-border/50">
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

      {/* Nested replies - with small indent */}
      {reply.nested_replies && reply.nested_replies.length > 0 && (
        <div className="ml-10 border-l-2 border-border/30 pl-3 mt-1">
          {reply.nested_replies.map(nestedReply => (
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