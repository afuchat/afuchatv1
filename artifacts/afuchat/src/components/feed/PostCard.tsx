import { useState, memo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, MoreHorizontal, Repeat2,
  Bookmark, Eye, Trash2, Flag, Edit3, Copy, X, Check,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { cn } from '@/lib/utils';
import { imgAvatar, imgPost } from '@/lib/cdn';
import type { FeedPost } from '@/hooks/useFeed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

const MENTION_HASH_REGEX = /(@[a-zA-Z0-9_-]+|#\w+)/g;

function parseContent(text: string): (string | React.ReactElement)[] {
  const safe = typeof text === 'string' ? text : String(text || '');
  const parts: (string | React.ReactElement)[] = [];
  let last = 0;
  for (const match of Array.from(safe.matchAll(MENTION_HASH_REGEX))) {
    const token = match[0];
    const idx = match.index!;
    if (idx > last) parts.push(safe.slice(last, idx));
    if (token.startsWith('@')) {
      parts.push(
        <span key={`m${idx}`} className="text-primary font-medium cursor-pointer hover:underline">
          {token}
        </span>
      );
    } else {
      const tag = token.slice(1);
      parts.push(
        <Link
          key={`h${idx}`}
          to={`/search?q=${encodeURIComponent(tag)}`}
          className="text-primary font-medium hover:underline"
          onClick={e => e.stopPropagation()}
        >
          {token}
        </Link>
      );
    }
    last = idx + token.length;
  }
  if (last < safe.length) parts.push(safe.slice(last));
  return parts;
}

interface PostCardProps {
  post: FeedPost;
  compact?: boolean;
  onDeleted?: (id: string) => void;
}

const PostCard = memo(({ post, compact = false, onDeleted }: PostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [liking, setLiking] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const profile = post.profiles;
  const displayName = profile?.display_name || 'Unknown';
  const handle = profile?.handle || 'unknown';
  const avatarUrl = profile?.avatar_url;
  const isVerified = profile?.is_verified || profile?.is_organization_verified;
  const premium = isPremium(profile?.platinum_until ?? null);

  const content = post.content ?? '';
  const MAX_CHARS = 300;
  const isLong = content.length > MAX_CHARS;
  const displayContent = isLong && !expanded ? content.slice(0, MAX_CHARS) : content;

  const isOwner = user?.id === post.author_id;

  const { data: liked = false } = useQuery({
    queryKey: ['post-liked', post.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await (supabase as any)
        .from('post_acknowledgments')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/auth/signin'); return; }
    if (liking) return;
    setLiking(true);

    const wasLiked = liked;
    queryClient.setQueryData(['post-liked', post.id, user.id], !wasLiked);
    setLikeCount(c => wasLiked ? Math.max(0, c - 1) : c + 1);
    if (!wasLiked) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 600);
    }

    try {
      if (wasLiked) {
        await (supabase as any)
          .from('post_acknowledgments')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await (supabase as any)
          .from('post_acknowledgments')
          .upsert({ post_id: post.id, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
      }
    } catch {
      queryClient.setQueryData(['post-liked', post.id, user.id], wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
    } finally {
      setLiking(false);
    }
  }, [user, liked, liking, post.id, navigate, queryClient]);

  const handleRepost = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/auth/signin'); return; }
    if (reposted) return;
    try {
      await (supabase as any).from('posts').insert({
        author_id: user.id,
        content: '',
        quoted_post_id: post.id,
        visibility: 'public',
      });
      setReposted(true);
      toast.success('Reposted!');
    } catch {
      toast.error('Failed to repost');
    }
  }, [user, post.id, reposted, navigate]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Post by ${displayName}`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [post.id, displayName]);

  const handleDelete = useCallback(async () => {
    if (!user || !isOwner) return;
    if (!confirm('Delete this post?')) return;
    try {
      await (supabase as any).from('posts').delete().eq('id', post.id);
      toast.success('Post deleted');
      onDeleted?.(post.id);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch {
      toast.error('Failed to delete');
    }
  }, [user, isOwner, post.id, onDeleted, queryClient]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success('Link copied!');
    setShowMenu(false);
  }, [post.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (!user || hasTrackedView.current || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true;
          (supabase as any).from('post_views').insert({ post_id: post.id, viewer_id: user.id }).then(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [user, post.id]);

  return (
    <article
      ref={cardRef}
      className={cn(
        "bg-card border border-border/40 rounded-2xl overflow-hidden",
        "hover:border-border/80 hover:shadow-sm transition-all duration-200 cursor-pointer",
        "active:scale-[0.995]"
      )}
      onClick={() => navigate(`/post/${post.id}`)}
    >
      <div className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <Link
            to={`/@${handle}`}
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 mt-0.5"
          >
            <div className="relative">
              <Avatar className={cn(
                "ring-2 ring-background",
                premium ? "ring-primary/40" : "",
                compact ? "h-9 w-9" : "h-10 w-10"
              )}>
                <AvatarImage src={imgAvatar(avatarUrl)} alt={displayName} loading="lazy" />
                <AvatarFallback className={cn(
                  "font-semibold text-sm",
                  premium ? "bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary" : "bg-primary/10 text-primary"
                )}>
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {premium && (
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                  <span className="text-[7px] text-white font-black">★</span>
                </span>
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <Link
                  to={`/@${handle}`}
                  onClick={e => e.stopPropagation()}
                  className="font-bold text-foreground hover:underline text-[15px] leading-tight"
                >
                  {displayName}
                </Link>
                {isVerified && (
                  <VerifiedBadge
                    isVerified={profile?.is_verified ?? undefined}
                    isOrgVerified={profile?.is_organization_verified ?? undefined}
                    size="sm"
                  />
                )}
                {premium && (
                  <span className="text-[9px] font-black text-white bg-gradient-to-r from-primary to-purple-500 px-1.5 py-0.5 rounded-full leading-none tracking-wide">
                    PLUS
                  </span>
                )}
                <span className="text-muted-foreground text-sm truncate max-w-[120px]">@{handle}</span>
                <span className="text-muted-foreground/50 text-sm">·</span>
                <span className="text-muted-foreground text-sm flex-shrink-0">{timeAgo(post.created_at)}</span>
              </div>

              {/* More menu */}
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  className="p-1.5 -mt-1 -mr-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-8 z-50 w-52 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 transition-colors text-foreground"
                        onClick={handleCopyLink}
                      >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                        Copy link
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 transition-colors text-foreground"
                        onClick={e => { e.stopPropagation(); handleShare(e); setShowMenu(false); }}
                      >
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                        Share post
                      </button>
                      {isOwner && (
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 transition-colors text-foreground"
                          onClick={e => { e.stopPropagation(); navigate(`/post/${post.id}`); setShowMenu(false); }}
                        >
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                          Edit post
                        </button>
                      )}
                      <div className="border-t border-border/50" />
                      {isOwner ? (
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-destructive/10 transition-colors text-destructive"
                          onClick={e => { e.stopPropagation(); handleDelete(); setShowMenu(false); }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete post
                        </button>
                      ) : (
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-destructive/10 transition-colors text-destructive"
                          onClick={e => { e.stopPropagation(); toast.info('Report submitted'); setShowMenu(false); }}
                        >
                          <Flag className="h-4 w-4" />
                          Report post
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Article title */}
            {post.is_article && post.article_title && (
              <p className="font-bold text-lg text-foreground mt-1 mb-0.5 leading-tight">{post.article_title}</p>
            )}

            {/* Content */}
            {content && (
              <div className="text-foreground/90 text-[15px] leading-relaxed mt-1.5 whitespace-pre-wrap break-words">
                {parseContent(displayContent)}
                {isLong && (
                  <button
                    className="text-primary hover:underline ml-1 font-semibold"
                    onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                  >
                    {expanded ? ' Show less' : ' See more'}
                  </button>
                )}
              </div>
            )}

            {/* Image */}
            {post.image_url && (
              <div className="mt-3 rounded-xl overflow-hidden border border-border/30 bg-muted/10">
                <img
                  src={imgPost(post.image_url)}
                  alt=""
                  className="w-full object-cover max-h-[400px]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}

            {/* Interaction bar */}
            <div className="flex items-center justify-between mt-3.5 -mx-1.5">
              {/* Like */}
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition-all duration-150 group relative",
                  liked
                    ? "text-rose-500"
                    : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/8"
                )}
                onClick={handleLike}
                aria-label="Like"
              >
                <span className="relative">
                  <Heart className={cn(
                    "h-4 w-4 transition-all duration-200",
                    liked && "fill-current scale-110",
                    heartAnim && "scale-125"
                  )} />
                  <AnimatePresence>
                    {heartAnim && (
                      <motion.span
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 text-rose-500 pointer-events-none"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {likeCount > 0 && (
                  <span className="text-xs font-semibold tabular-nums">{formatCount(likeCount)}</span>
                )}
              </button>

              {/* Comment */}
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                onClick={e => { e.stopPropagation(); navigate(`/post/${post.id}#comments`); }}
                aria-label="Comment"
              >
                <MessageCircle className="h-4 w-4" />
                {(post.comment_count ?? 0) > 0 && (
                  <span className="text-xs font-semibold tabular-nums">{formatCount(post.comment_count)}</span>
                )}
              </button>

              {/* Repost */}
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition-colors",
                  reposted
                    ? "text-emerald-500"
                    : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/8"
                )}
                onClick={handleRepost}
                aria-label="Repost"
              >
                <Repeat2 className={cn("h-4 w-4", reposted && "text-emerald-500")} />
                {(post.repost_count ?? 0) > 0 && (
                  <span className="text-xs font-semibold tabular-nums">{formatCount(post.repost_count)}</span>
                )}
              </button>

              {/* Share */}
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition-colors",
                  copied ? "text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/8"
                )}
                onClick={handleShare}
                aria-label="Share"
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              </button>

              {/* Views */}
              {(post.view_count ?? 0) > 0 && (
                <button
                  className="flex items-center gap-1 px-1.5 py-1.5 rounded-full text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                  onClick={e => e.stopPropagation()}
                  aria-label="Views"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{formatCount(post.view_count)}</span>
                </button>
              )}

              {/* Bookmark */}
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition-colors ml-auto",
                  bookmarked ? "text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/8"
                )}
                onClick={e => { e.stopPropagation(); setBookmarked(v => !v); if (!bookmarked) toast.success('Saved!'); }}
                aria-label="Bookmark"
              >
                <Bookmark className={cn("h-4 w-4 transition-all", bookmarked && "fill-current")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
