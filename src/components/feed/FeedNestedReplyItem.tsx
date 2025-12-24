import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAITranslation } from '@/hooks/useAITranslation';
import { MessageCircle, Pin, Trash2, Heart, MoreHorizontal } from 'lucide-react';
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
  const [showMoreActions, setShowMoreActions] = useState(false);

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

  const displayContent = translatedContent || (typeof reply.content === 'string' ? reply.content : String(reply.content || ''));

  return (
    <div className="relative">
      {/* Twitter/X style thread line connecting avatars */}
      {depth > 0 && (
        <div 
          className="absolute left-5 top-0 w-0.5 bg-border" 
          style={{ height: '12px', transform: 'translateY(-12px)' }}
        />
      )}
      
      {/* Pinned indicator */}
      {reply.is_pinned && (
        <div className="flex items-center gap-1 text-[11px] text-primary font-medium mb-1 ml-12">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      
      <div className="flex gap-3 py-3">
        {/* Avatar with thread line below for nested replies */}
        <div className="relative flex-shrink-0">
          <div
            className="cursor-pointer"
            onClick={() => handleViewProfile(reply.author_id)}
          >
            <Avatar className="h-10 w-10 border border-border/50">
              <AvatarImage src={reply.profiles.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {reply.profiles.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Thread line connecting to nested replies */}
          {reply.nested_replies && reply.nested_replies.length > 0 && (
            <div 
              className="absolute left-1/2 top-12 w-0.5 bg-border -translate-x-1/2"
              style={{ height: 'calc(100% - 48px)' }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row - Twitter style */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              <span
                className="font-bold text-foreground text-[15px] cursor-pointer hover:underline truncate"
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
              <span
                className="text-muted-foreground text-[15px] cursor-pointer hover:underline truncate"
                onClick={() => handleViewProfile(reply.author_id)}
              >
                @{reply.profiles.handle}
              </span>
              <span className="text-muted-foreground text-[15px]">·</span>
              <span className="text-muted-foreground text-[15px] hover:underline cursor-pointer">
                {formatTime(reply.created_at)}
              </span>
            </div>
            
            {/* More actions button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Reply content */}
          <div className="text-foreground text-[15px] leading-[1.4] whitespace-pre-wrap break-words mt-0.5">
            {parsePostContent(displayContent, navigate)}
          </div>

          {/* Action buttons - Twitter style */}
          <div className="flex items-center gap-1 mt-3 -ml-2">
            {/* Reply button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyInput(!showReplyInput)}
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
                onClick={handleTranslate}
                disabled={isTranslating}
                className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full text-[13px]"
              >
                {isTranslating ? t('common.translating') : translatedContent ? t('common.showOriginal') : t('common.translate')}
              </Button>
            )}
            
            {/* Pin button - only for post author on top-level replies */}
            {isPostAuthor && depth === 0 && (
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
            {currentUserId && (currentUserId === reply.author_id || isPostAuthor) && (
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

          {/* Reply input - Twitter style */}
          {showReplyInput && (
            <div className="mt-3 flex items-start gap-3 pt-3 border-t border-border/50">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  Y
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReplySubmit();
                    }
                  }}
                  placeholder={`Reply to @${reply.profiles.handle}`}
                  className="w-full bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none py-2"
                  autoFocus
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim()}
                    className="rounded-full px-4 h-8 font-bold text-sm"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Nested replies - no depth limit, Twitter-style threading */}
          {reply.nested_replies && reply.nested_replies.length > 0 && (
            <div className="mt-1">
              {reply.nested_replies.map((nestedReply) => (
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
      </div>
    </div>
  );
};