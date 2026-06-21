import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Heart, MessageCircle, Repeat2, Share2,
  Bookmark, Eye, MoreHorizontal, Pin, Trash2, Flag,
  Send, X, Check, Edit3, ChevronDown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { imgAvatar, imgPost } from '@/lib/cdn';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { checkContentAllowed } from '@/lib/contentModeration';

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFull(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    hour: '2-digit', minute: '2-digit',
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

const MENTION_REGEX = /(@[a-zA-Z0-9_-]+|#\w+|https?:\/\/[^\s]+)/g;

function renderContent(text: string): React.ReactNode {
  const safe = typeof text === 'string' ? text : String(text || '');
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of Array.from(safe.matchAll(MENTION_REGEX))) {
    const token = match[0];
    const idx = match.index!;
    if (idx > last) parts.push(safe.slice(last, idx));
    if (token.startsWith('@')) {
      parts.push(<Link key={`m${idx}`} to={`/@${token.slice(1)}`} className="text-primary font-semibold hover:underline" onClick={e => e.stopPropagation()}>{token}</Link>);
    } else if (token.startsWith('#')) {
      parts.push(<Link key={`h${idx}`} to={`/search?q=${encodeURIComponent(token.slice(1))}`} className="text-primary font-medium hover:underline" onClick={e => e.stopPropagation()}>{token}</Link>);
    } else {
      parts.push(<a key={`u${idx}`} href={token} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{token.length > 50 ? token.slice(0, 50) + '…' : token}</a>);
    }
    last = idx + token.length;
  }
  if (last < safe.length) parts.push(safe.slice(last));
  return <>{parts}</>;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  parent_reply_id: string | null;
  author_id: string;
  is_pinned?: boolean;
  nested_replies?: Reply[];
  author: {
    id: string;
    display_name: string;
    handle: string;
    is_verified: boolean | null;
    is_organization_verified: boolean | null;
    avatar_url: string | null;
  };
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  post_images?: Array<{ image_url: string; display_order: number; alt_text?: string | null }>;
  likes_count: number;
  replies_count: number;
  view_count: number;
  author: {
    id: string;
    display_name: string;
    handle: string;
    is_verified: boolean | null;
    is_organization_verified: boolean | null;
    avatar_url: string | null;
  };
}

function organizeReplies(flat: Reply[]): Reply[] {
  const map = new Map<string, Reply>();
  const roots: Reply[] = [];
  flat.forEach(r => map.set(r.id, { ...r, nested_replies: [] }));
  flat.forEach(r => {
    const node = map.get(r.id)!;
    if (r.parent_reply_id && map.has(r.parent_reply_id)) {
      map.get(r.parent_reply_id)!.nested_replies!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function CommentItem({
  reply,
  postId,
  depth = 0,
  postAuthorId,
  currentUserId,
  onDelete,
  onPin,
  onRefresh,
}: {
  reply: Reply;
  postId: string;
  depth?: number;
  postAuthorId: string;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onRefresh: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNested, setShowNested] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = currentUserId === reply.author_id;
  const isPostAuthor = currentUserId === postAuthorId;
  const hasNested = (reply.nested_replies?.length ?? 0) > 0;
  const indent = Math.min(depth, 3) * 44;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !currentUserId || submitting) return;
    const err = checkContentAllowed(replyText);
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      await (supabase as any).from('post_replies').insert({
        post_id: postId,
        author_id: currentUserId,
        content: `@${reply.author.handle} ${replyText.trim()}`,
        parent_reply_id: reply.id,
      });
      setReplyText('');
      setShowReply(false);
      onRefresh();
    } catch { toast.error('Failed to reply'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex gap-3 px-4 py-3 hover:bg-muted/20 transition-colors relative" style={{ paddingLeft: `${16 + indent}px` }}>
        {/* Thread line for nested */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 border-l-2 border-border/30"
            style={{ left: `${indent - 12}px` }} />
        )}

        <Link to={`/@${reply.author.handle}`} className="flex-shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
          <Avatar className="h-9 w-9 border border-border/30">
            <AvatarImage src={imgAvatar(reply.author.avatar_url)} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {reply.author.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {reply.is_pinned && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </span>
              )}
              <Link to={`/@${reply.author.handle}`} className="font-bold text-foreground hover:underline text-sm">
                {reply.author.display_name}
              </Link>
              <VerifiedBadge
                isVerified={reply.author.is_verified ?? undefined}
                isOrgVerified={reply.author.is_organization_verified ?? undefined}
                size="sm"
              />
              <span className="text-muted-foreground text-xs">@{reply.author.handle}</span>
              <span className="text-muted-foreground/50 text-xs">·</span>
              <span className="text-muted-foreground text-xs">{timeAgo(reply.created_at)}</span>
            </div>

            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => setShowMenu(v => !v)}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-7 z-50 w-44 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
                  >
                    {(isOwner || isPostAuthor) && (
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 text-destructive"
                        onClick={() => { onDelete(reply.id); setShowMenu(false); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                    {isPostAuthor && depth === 0 && (
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 text-foreground"
                        onClick={() => { onPin(reply.id, reply.is_pinned ?? false); setShowMenu(false); }}
                      >
                        <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                        {reply.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                    {!isOwner && (
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 text-foreground"
                        onClick={() => { toast.info('Reported'); setShowMenu(false); }}
                      >
                        <Flag className="h-3.5 w-3.5 text-muted-foreground" /> Report
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <p className="text-foreground text-[14px] leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {renderContent(reply.content)}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-5 mt-2">
            <button
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
              )}
              onClick={() => {
                setLiked(v => !v);
                setLikeCount(c => liked ? Math.max(0, c - 1) : c + 1);
              }}
            >
              <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
              {likeCount > 0 && <span className="font-medium">{likeCount}</span>}
            </button>

            {currentUserId && (
              <button
                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                onClick={() => { setShowReply(v => !v); setTimeout(() => textareaRef.current?.focus(), 100); }}
              >
                Reply
              </button>
            )}

            {hasNested && (
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setShowNested(v => !v)}
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !showNested && "-rotate-90")} />
                {showNested ? 'Hide' : `Show ${reply.nested_replies!.length}`} replies
              </button>
            )}
          </div>

          {/* Inline reply input */}
          <AnimatePresence>
            {showReply && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex gap-2 items-start">
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={e => { setReplyText(e.target.value); adjustHeight(); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) { e.preventDefault(); submitReply(); } }}
                    placeholder={`Reply to @${reply.author.handle}…`}
                    rows={1}
                    className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none overflow-hidden"
                    style={{ maxHeight: '100px' }}
                  />
                  <button
                    onClick={submitReply}
                    disabled={!replyText.trim() || submitting}
                    className="flex-shrink-0 p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nested replies */}
      <AnimatePresence>
        {showNested && hasNested && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {reply.nested_replies!.map(nested => (
              <CommentItem
                key={nested.id}
                reply={nested}
                postId={postId}
                depth={depth + 1}
                postAuthorId={postAuthorId}
                currentUserId={currentUserId}
                onDelete={onDelete}
                onPin={onPin}
                onRefresh={onRefresh}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PostDetail() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'top'>('oldest');

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('posts')
        .select(`
          id, content, created_at, image_url, view_count,
          post_images(image_url, display_order, alt_text),
          profiles!inner(id, display_name, handle, is_verified, is_organization_verified, avatar_url)
        `)
        .eq('id', postId)
        .single();

      if (error || !data) { setLoading(false); return; }

      const [likesRes, repliesCountRes] = await Promise.all([
        (supabase as any).rpc('get_post_like_counts', { post_ids: [postId] }),
        (supabase as any).rpc('get_post_reply_counts', { post_ids: [postId] }),
      ]);

      const likesCount = Array.isArray(likesRes.data) ? Number(likesRes.data[0]?.like_count ?? 0) : 0;
      const repliesCount = Array.isArray(repliesCountRes.data) ? Number(repliesCountRes.data[0]?.reply_count ?? 0) : 0;

      setPost({
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        image_url: data.image_url,
        post_images: data.post_images || [],
        likes_count: likesCount,
        replies_count: repliesCount,
        view_count: data.view_count || 0,
        author: {
          id: data.profiles.id,
          display_name: data.profiles.display_name,
          handle: data.profiles.handle,
          is_verified: data.profiles.is_verified,
          is_organization_verified: data.profiles.is_organization_verified,
          avatar_url: data.profiles.avatar_url,
        },
      });
      setLikesCount(likesCount);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchReplies = useCallback(async () => {
    if (!postId) return;
    setRepliesLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('post_replies')
        .select(`
          id, content, created_at, parent_reply_id, author_id, is_pinned,
          profiles!inner(id, display_name, handle, is_verified, is_organization_verified, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (data) {
        const mapped: Reply[] = data.map((r: any) => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          parent_reply_id: r.parent_reply_id,
          author_id: r.author_id,
          is_pinned: r.is_pinned,
          author: {
            id: r.profiles.id,
            display_name: r.profiles.display_name,
            handle: r.profiles.handle,
            is_verified: r.profiles.is_verified,
            is_organization_verified: r.profiles.is_organization_verified,
            avatar_url: r.profiles.avatar_url,
          },
        }));
        setReplies(organizeReplies(mapped));
      }
    } finally {
      setRepliesLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchPost(); fetchReplies(); }, [fetchPost, fetchReplies]);

  // Check liked status
  useEffect(() => {
    if (!user || !postId) return;
    (supabase as any)
      .from('post_acknowledgments')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => setLiked(!!data));
  }, [user, postId]);

  // Track view
  useEffect(() => {
    if (!user || !postRef.current || hasTrackedView.current || !postId) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasTrackedView.current) {
        hasTrackedView.current = true;
        (supabase as any).from('post_views').insert({ post_id: postId, viewer_id: user.id }).then(() => {});
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(postRef.current);
    return () => observer.disconnect();
  }, [user, postId]);

  // Real-time subscription for new comments
  useEffect(() => {
    if (!postId) return;
    const channel = (supabase as any)
      .channel(`post-replies-${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'post_replies',
        filter: `post_id=eq.${postId}`,
      }, () => { fetchReplies(); })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'post_replies',
        filter: `post_id=eq.${postId}`,
      }, () => { fetchReplies(); })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [postId, fetchReplies]);

  const handleLike = useCallback(async () => {
    if (!user) { navigate('/auth/signin'); return; }
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(c => wasLiked ? Math.max(0, c - 1) : c + 1);
    if (!wasLiked) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 600); }
    try {
      if (wasLiked) {
        await (supabase as any).from('post_acknowledgments').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await (supabase as any).from('post_acknowledgments').upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
      }
      const { data: counts } = await (supabase as any).rpc('get_post_like_counts', { post_ids: [postId] });
      if (Array.isArray(counts) && counts[0]?.like_count != null) setLikesCount(Number(counts[0].like_count));
    } catch {
      setLiked(wasLiked);
      setLikesCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
    } finally { setLiking(false); }
  }, [user, liked, liking, postId, navigate]);

  const handleRepost = useCallback(async () => {
    if (!user) { navigate('/auth/signin'); return; }
    if (reposted) return;
    try {
      await (supabase as any).from('posts').insert({ author_id: user.id, content: '', quoted_post_id: postId, visibility: 'public' });
      setReposted(true);
      toast.success('Reposted!');
    } catch { toast.error('Failed to repost'); }
  }, [user, postId, reposted, navigate]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      try { await navigator.share({ title: post ? `Post by ${post.author.display_name}` : 'Post', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [postId, post]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !user || submitting) return;
    const err = checkContentAllowed(commentText);
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      await (supabase as any).from('post_replies').insert({
        post_id: postId,
        author_id: user.id,
        content: commentText.trim(),
        parent_reply_id: null,
      });
      setCommentText('');
      if (commentInputRef.current) commentInputRef.current.style.height = 'auto';
      await fetchReplies();
      setPost(p => p ? { ...p, replies_count: p.replies_count + 1 } : p);
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  }, [commentText, user, submitting, postId, fetchReplies]);

  const handleDeleteReply = useCallback(async (replyId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await (supabase as any).from('post_replies').delete().eq('id', replyId);
      toast.success('Comment deleted');
      await fetchReplies();
    } catch { toast.error('Failed to delete'); }
  }, [fetchReplies]);

  const handlePinReply = useCallback(async (replyId: string, currentPinned: boolean) => {
    if (!user || user.id !== post?.author.id) { toast.error('Only the post author can pin'); return; }
    try {
      await (supabase as any).from('post_replies').update({
        is_pinned: !currentPinned,
        pinned_by: !currentPinned ? user.id : null,
        pinned_at: !currentPinned ? new Date().toISOString() : null,
      }).eq('id', replyId);
      toast.success(currentPinned ? 'Comment unpinned' : 'Comment pinned');
      await fetchReplies();
    } catch { toast.error('Failed to update pin'); }
  }, [user, post, fetchReplies]);

  const adjustCommentHeight = () => {
    const el = commentInputRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4 animate-pulse">
          <div className="flex gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-2/5" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-4/5" />
            <div className="h-4 bg-muted rounded w-3/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-bold">Post not found</h2>
        <p className="text-muted-foreground text-sm">This post may have been deleted or is unavailable.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  const sortedReplies = [...replies].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return 0;
  });

  const images = (post.post_images ?? []).sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="max-w-2xl mx-auto bg-background border-x border-border/40 min-h-screen pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/60"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Post</h1>
        </div>
      </div>

      {/* Main post */}
      <div ref={postRef} className="p-4 border-b border-border/40">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-4">
          <Link to={`/@${post.author.handle}`}>
            <Avatar className="h-12 w-12 border border-border/30">
              <AvatarImage src={imgAvatar(post.author.avatar_url)} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {post.author.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link to={`/@${post.author.handle}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-foreground text-[16px] hover:underline">{post.author.display_name}</span>
              <VerifiedBadge
                isVerified={post.author.is_verified ?? undefined}
                isOrgVerified={post.author.is_organization_verified ?? undefined}
                size="sm"
              />
            </div>
            <p className="text-sm text-muted-foreground">@{post.author.handle}</p>
          </Link>
        </div>

        {/* Content */}
        <div className="text-foreground text-[17px] leading-relaxed whitespace-pre-wrap break-words mb-4">
          {renderContent(post.content)}
        </div>

        {/* Images */}
        {images.length > 1 ? (
          <div className="mb-4 rounded-2xl overflow-hidden border border-border/30">
            <ImageCarousel images={images.map(img => img.image_url)} />
          </div>
        ) : images.length === 1 ? (
          <div className="mb-4 rounded-2xl overflow-hidden border border-border/30">
            <img src={imgPost(images[0].image_url)} alt={images[0].alt_text || ''} className="w-full object-cover max-h-[500px]" loading="lazy" />
          </div>
        ) : post.image_url ? (
          <div className="mb-4 rounded-2xl overflow-hidden border border-border/30">
            <img src={imgPost(post.image_url)} alt="" className="w-full object-cover max-h-[500px]" loading="lazy" />
          </div>
        ) : null}

        {/* Timestamp */}
        <p className="text-sm text-muted-foreground mb-4">{formatFull(post.created_at)}</p>

        {/* Stats row */}
        {(likesCount > 0 || post.replies_count > 0 || post.view_count > 0) && (
          <div className="flex items-center gap-5 py-3 border-y border-border/40 mb-3">
            {likesCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground text-[15px]">{formatCount(likesCount)}</span>
                <span className="text-muted-foreground text-sm">Likes</span>
              </div>
            )}
            {post.replies_count > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground text-[15px]">{formatCount(post.replies_count)}</span>
                <span className="text-muted-foreground text-sm">Comments</span>
              </div>
            )}
            {post.view_count > 0 && (
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-foreground text-[15px]">{formatCount(post.view_count)}</span>
                <span className="text-muted-foreground text-sm">Views</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          {/* Like */}
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-all",
              liked ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/8"
            )}
            onClick={handleLike}
            disabled={liking}
          >
            <span className="relative">
              <Heart className={cn("h-5 w-5 transition-all", liked && "fill-current", heartAnim && "scale-125")} />
              <AnimatePresence>
                {heartAnim && (
                  <motion.span
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 text-rose-500 pointer-events-none"
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            Like
          </button>

          {/* Comment */}
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
            onClick={() => commentInputRef.current?.focus()}
          >
            <MessageCircle className="h-5 w-5" />
            Comment
          </button>

          {/* Repost */}
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors",
              reposted ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/8"
            )}
            onClick={handleRepost}
          >
            <Repeat2 className="h-5 w-5" />
            Repost
          </button>

          {/* Share */}
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors",
              copied ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/8"
            )}
            onClick={handleShare}
          >
            {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
            Share
          </button>

          {/* Bookmark */}
          <button
            className={cn(
              "p-2 rounded-full text-sm transition-colors",
              bookmarked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/8"
            )}
            onClick={() => { setBookmarked(v => !v); if (!bookmarked) toast.success('Saved!'); }}
          >
            <Bookmark className={cn("h-5 w-5", bookmarked && "fill-current")} />
          </button>
        </div>
      </div>

      {/* Comment input */}
      <div id="comments" className="border-b border-border/40 p-4">
        {user ? (
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={imgAvatar(undefined)} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2 items-start">
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => { setCommentText(e.target.value); adjustCommentHeight(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) { e.preventDefault(); handleSubmitComment(); } }}
                placeholder="Write a comment…"
                rows={1}
                className="flex-1 bg-muted/50 border border-border/50 rounded-2xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none overflow-hidden"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className="flex-shrink-0 p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-3">Sign in to join the conversation</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={() => navigate('/auth/signin')} className="rounded-xl">Sign In</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/auth/signup')} className="rounded-xl">Create Account</Button>
            </div>
          </div>
        )}
      </div>

      {/* Comments section */}
      <div>
        {/* Sort header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <h3 className="font-bold text-foreground">
            {post.replies_count > 0 ? `${formatCount(post.replies_count)} Comments` : 'Comments'}
          </h3>
          <div className="relative">
            <button
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              onClick={() => setShowSortMenu(v => !v)}
            >
              {sort === 'newest' ? 'Newest' : sort === 'oldest' ? 'Oldest' : 'Top'}
              <ChevronDown className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-8 z-50 w-36 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
                >
                  {(['newest', 'oldest'] as const).map(s => (
                    <button
                      key={s}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors capitalize",
                        sort === s ? "text-primary font-semibold" : "text-foreground"
                      )}
                      onClick={() => { setSort(s); setShowSortMenu(false); }}
                    >
                      {s}
                      {sort === s && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Comment list */}
        {repliesLoading ? (
          <div className="space-y-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                  <div className="h-3 bg-muted rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedReplies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No comments yet</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Be the first to comment</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <AnimatePresence initial={false}>
              {sortedReplies.map(reply => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CommentItem
                    reply={reply}
                    postId={postId!}
                    postAuthorId={post.author.id}
                    currentUserId={user?.id}
                    onDelete={handleDeleteReply}
                    onPin={handlePinReply}
                    onRefresh={fetchReplies}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
