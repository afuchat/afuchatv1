import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { checkContentAllowed } from '@/lib/contentModeration';
import { InputSuggestions, useCursorPosition } from '@/components/ui/InputSuggestions';

interface CommentInputProps {
  postId: string;
  replyingTo?: { replyId: string; authorHandle: string } | null;
  postAuthorHandle?: string;
  onCancelReply?: () => void;
  onCommentSubmitted?: () => void;
  className?: string;
  compact?: boolean;
  autoFocus?: boolean;
}

// Detect mobile devices
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const CommentInput = ({
  postId,
  replyingTo,
  postAuthorHandle,
  onCancelReply,
  onCommentSubmitted,
  className,
  compact = false,
  autoFocus = false,
}: CommentInputProps) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosition = useCursorPosition(textareaRef);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  const handleSuggestionSelect = useCallback((
    suggestion: { type: 'hashtag' | 'user'; value: string },
    startIndex: number,
    endIndex: number
  ) => {
    const prefix = suggestion.type === 'hashtag' ? '#' : '@';
    const replacement = `${prefix}${suggestion.value} `;
    const newText = commentText.slice(0, startIndex) + replacement + commentText.slice(endIndex);
    setCommentText(newText);
    
    // Move cursor to after the inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = startIndex + replacement.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [commentText]);

  // Fetch user profile for avatar
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setUserProfile(data));
    }
  }, [user]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [commentText, adjustTextareaHeight]);

  const targetHandle = replyingTo?.authorHandle || postAuthorHandle;

  const handleSubmit = async () => {
    if (!commentText.trim() || !user) return;

    // Content moderation - check for blocked links
    const contentError = checkContentAllowed(commentText);
    if (contentError) {
      toast.error(contentError, { duration: 5000 });
      return;
    }

    setSubmitting(true);
    try {
      let finalContent = commentText.trim();
      
      if (replyingTo) {
        const mention = `@${replyingTo.authorHandle}`;
        if (!finalContent.includes(mention)) {
          finalContent = `${finalContent} ${mention}`;
        }
      }

      const { error } = await supabase
        .from('post_replies')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: finalContent,
          parent_reply_id: replyingTo?.replyId || null,
        });

      if (error) throw error;

      setCommentText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      onCancelReply?.();
      onCommentSubmitted?.();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Only submit on Enter for desktop, not mobile
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!user) {
    return (
      <div className={cn("px-4 py-3 border-t border-border bg-background", className)}>
        <p className="text-muted-foreground text-center text-sm">Sign in to comment</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 bg-background",
      compact ? "px-3 py-2" : "px-4 py-3 border-t border-border",
      className
    )}>
      {/* Avatar */}
      <Avatar className={cn(compact ? "h-8 w-8" : "h-10 w-10", "flex-shrink-0")}>
        <AvatarImage src={userProfile?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {user.email?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      {/* Auto-expanding textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={targetHandle ? `@${targetHandle}` : "Write a comment..."}
          rows={1}
          className={cn(
            "w-full bg-muted/50 border border-border/50 rounded-2xl px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none overflow-hidden",
            compact ? "py-2 min-h-[36px]" : "py-2.5 min-h-[44px]"
          )}
          style={{ maxHeight: '120px' }}
        />
        
        {/* Input Suggestions for # and @ */}
        <InputSuggestions
          text={commentText}
          cursorPosition={cursorPosition}
          onSelect={handleSuggestionSelect}
          containerRef={textareaRef as any}
          className="bottom-full left-0 mb-1"
        />
      </div>
      
      {/* Reply button */}
      <Button
        onClick={handleSubmit}
        disabled={!commentText.trim() || submitting}
        variant="ghost"
        size="sm"
        className={cn(
          "font-semibold text-primary hover:text-primary/80 hover:bg-transparent px-2",
          (!commentText.trim() || submitting) && "opacity-50"
        )}
      >
        {submitting ? '...' : 'Reply'}
      </Button>
    </div>
  );
};
