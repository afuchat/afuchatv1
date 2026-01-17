import { useState, useCallback } from 'react';
import { Heart, MessageSquare, Send, TrendingUp, Repeat2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface PostInteractionButtonsProps {
  postId: string;
  initialLikeCount: number;
  initialReplyCount: number;
  initialViewCount: number;
  initialIsLiked?: boolean;
  onCommentClick?: () => void;
  showCommentInput?: boolean;
  compact?: boolean;
  className?: string;
}

export const PostInteractionButtons = ({
  postId,
  initialLikeCount,
  initialReplyCount,
  initialViewCount,
  initialIsLiked = false,
  onCommentClick,
  showCommentInput = false,
  compact = false,
  className,
}: PostInteractionButtonsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(showCommentInput);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyCount, setReplyCount] = useState(initialReplyCount);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      navigate('/auth/signin');
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('post_acknowledgments')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_acknowledgments')
          .upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
        if (error) throw error;
      }

      // Always sync to the real DB count (prevents “1 like” vs “4 likes” mismatches)
      const { data: counts, error: countErr } = await supabase.rpc('get_post_like_counts', { post_ids: [postId] });
      if (!countErr && Array.isArray(counts) && counts[0]?.like_count != null) {
        setLikeCount(Number(counts[0].like_count));
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      console.error('Like error:', error);
      toast.error(t('common.likeError', wasLiked ? 'Failed to unlike post' : 'Failed to like post'));
    } finally {
      setIsLiking(false);
    }
  }, [user, postId, isLiked, isLiking, navigate, t]);

  const handleCommentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/auth/signin');
      return;
    }

    if (onCommentClick) {
      onCommentClick();
    } else {
      setShowReplyInput(!showReplyInput);
    }
  }, [user, navigate, onCommentClick, showReplyInput]);

  const handleSubmitReply = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !replyContent.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const { error } = await supabase
        .from('post_replies')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: replyContent.trim(),
        });

      if (error) throw error;

      setReplyContent('');
      setReplyCount(prev => prev + 1);
      setShowReplyInput(false);
      toast.success(t('common.replyPosted', 'Reply posted!'));
    } catch (error) {
      console.error('Reply error:', error);
      toast.error(t('common.replyError', 'Failed to post reply'));
    } finally {
      setIsSubmittingReply(false);
    }
  }, [user, postId, replyContent, isSubmittingReply, t]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${postId}`;
    
    if (navigator.share) {
      navigator.share({ url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t('common.linkCopied', 'Link copied!'));
    }
  }, [postId, t]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("flex items-center text-muted-foreground", compact ? "gap-4" : "gap-5")}>
        {/* Comment Button */}
        <button 
          className="flex items-center gap-1.5 group hover:text-primary transition-colors"
          onClick={handleCommentClick}
        >
          <MessageSquare className={cn("group-hover:text-primary", compact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2} />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{replyCount}</span>
        </button>

        {/* Like Button */}
        <button 
          className={cn(
            "flex items-center gap-1.5 group transition-colors",
            isLiked ? "text-red-500" : "hover:text-red-500"
          )}
          onClick={handleLike}
          disabled={isLiking}
        >
          <Heart 
            className={cn(
              "transition-all",
              compact ? "h-4 w-4" : "h-5 w-5",
              isLiked ? "fill-red-500 text-red-500" : "group-hover:text-red-500"
            )} 
            strokeWidth={2}
          />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{likeCount}</span>
        </button>

        {/* Views */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <TrendingUp className={cn(compact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2} />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{initialViewCount}</span>
        </div>

        {/* Share Button */}
        <button 
          className="flex items-center gap-1.5 group hover:text-primary transition-colors"
          onClick={handleShare}
        >
          <Send className={cn("group-hover:text-primary", compact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2} />
        </button>
      </div>

      {/* Reply Input (inline) */}
      {showReplyInput && (
        <form 
          onSubmit={handleSubmitReply} 
          onClick={(e) => e.stopPropagation()}
          className="flex gap-2 mt-2"
        >
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={t('common.writeReply', 'Write a reply...')}
            className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            type="submit"
            disabled={!replyContent.trim() || isSubmittingReply}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isSubmittingReply ? '...' : t('common.reply', 'Reply')}
          </button>
        </form>
      )}
    </div>
  );
};

export default PostInteractionButtons;
