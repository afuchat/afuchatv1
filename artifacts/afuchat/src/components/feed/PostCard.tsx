import { useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreHorizontal, Repeat2, Bookmark } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/hooks/useFeed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function isPremium(platinumUntil: string | null): boolean {
  if (!platinumUntil) return false;
  return new Date(platinumUntil) > new Date();
}

interface PostCardProps {
  post: FeedPost;
  compact?: boolean;
}

const PostCard = memo(({ post, compact = false }: PostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [expanded, setExpanded] = useState(false);

  const profile = post.profiles;
  const displayName = profile?.display_name || 'Unknown';
  const handle = profile?.handle || 'unknown';
  const avatarUrl = profile?.avatar_url;
  const isVerified = profile?.is_verified || profile?.is_organization_verified;
  const premium = isPremium(profile?.platinum_until ?? null);

  const content = post.content ?? '';
  const MAX_CHARS = 280;
  const isLong = content.length > MAX_CHARS;
  const displayContent = isLong && !expanded ? content.slice(0, MAX_CHARS) + '...' : content;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/auth/signin'); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
    try {
      const db = supabase as any;
      if (newLiked) {
        await db.from('post_likes').insert({ post_id: post.id, user_id: user.id });
      } else {
        await db.from('post_likes').delete()
          .eq('post_id', post.id).eq('user_id', user.id);
      }
    } catch {
      setLiked(!newLiked);
      setLikeCount(c => newLiked ? Math.max(0, c - 1) : c + 1);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  return (
    <article
      className="bg-card border border-border/50 rounded-2xl p-4 hover:border-border transition-colors cursor-pointer"
      onClick={() => navigate(`/post/${post.id}`)}
    >
      <div className="flex gap-3">
        <Link
          to={`/@${handle}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0"
        >
          <Avatar className={cn("ring-2 ring-background", premium ? "ring-primary/30" : "", compact ? "h-8 w-8" : "h-10 w-10")}>
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} loading="lazy" />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <Link
                to={`/@${handle}`}
                onClick={e => e.stopPropagation()}
                className="font-semibold text-foreground hover:underline truncate text-[15px]"
              >
                {displayName}
              </Link>
              {isVerified && <VerifiedBadge size="sm" />}
              {premium && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none">
                  PLUS
                </span>
              )}
              <span className="text-muted-foreground text-sm truncate">@{handle}</span>
              <span className="text-muted-foreground/60 text-sm">·</span>
              <span className="text-muted-foreground text-sm flex-shrink-0">
                {timeAgo(post.created_at)}
              </span>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground flex-shrink-0 p-1 -mr-1 -mt-1 rounded-full hover:bg-muted/50 transition-colors"
              onClick={e => e.stopPropagation()}
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {post.is_article && post.article_title && (
            <p className="font-bold text-lg text-foreground mt-1 mb-1">{post.article_title}</p>
          )}

          {content && (
            <p className="text-foreground/90 text-[15px] leading-relaxed mt-1 whitespace-pre-wrap break-words">
              {displayContent}
              {isLong && (
                <button
                  className="text-primary hover:underline ml-1 font-medium"
                  onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                >
                  {expanded ? ' Show less' : ' See more'}
                </button>
              )}
            </p>
          )}

          {post.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border/30 bg-muted/20">
              <img
                src={post.image_url}
                alt=""
                className="w-full object-cover max-h-[400px]"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 -mx-1">
            <button
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition-colors group",
                liked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              )}
              onClick={handleLike}
              aria-label="Like"
            >
              <Heart className={cn("h-4 w-4 transition-transform group-active:scale-125", liked && "fill-current")} />
              {likeCount > 0 && <span className="text-xs font-medium">{formatCount(likeCount)}</span>}
            </button>

            <button
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              onClick={e => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
              aria-label="Comment"
            >
              <MessageCircle className="h-4 w-4" />
              {(post.comment_count ?? 0) > 0 && (
                <span className="text-xs font-medium">{formatCount(post.comment_count)}</span>
              )}
            </button>

            <button
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
              onClick={e => e.stopPropagation()}
              aria-label="Repost"
            >
              <Repeat2 className="h-4 w-4" />
              {(post.repost_count ?? 0) > 0 && (
                <span className="text-xs font-medium">{formatCount(post.repost_count)}</span>
              )}
            </button>

            <button
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              onClick={handleShare}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              onClick={e => e.stopPropagation()}
              aria-label="Bookmark"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
