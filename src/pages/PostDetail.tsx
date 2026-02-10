import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageSkeleton } from '@/components/skeletons';
import { TrendingUp, MessageCircle, Heart, Pencil, Send, Repeat2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { useAITranslation } from '@/hooks/useAITranslation';
import { LinkPreviewCard } from '@/components/ui/LinkPreviewCard';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { NestedReplyItem } from '@/components/post-detail/NestedReplyItem';
import { ViewsAnalyticsSheet } from '@/components/ViewsAnalyticsSheet';
import { QuotedPostCard } from '@/components/feed/QuotedPostCard';
import { CommentInput } from '@/components/feed/CommentInput';
import { WarningBadge } from '@/components/WarningBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { EditPostModal } from '@/components/EditPostModal';
import FloatingActionButton from '@/components/ui/FloatingActionButton';


// --- Utility to render text with clickable mentions, hashtags, and links ---
const renderContentWithMentions = (content: string) => {
  const safeContent = typeof content === 'string' ? content : String(content || '');
  const combinedRegex = /(@[a-zA-Z0-9_-]+|#\w+|https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  const matches = Array.from(safeContent.matchAll(combinedRegex));
  
  matches.forEach((match, idx) => {
    const matchText = match[0];
    const index = match.index!;
    
    if (index > lastIndex) {
      parts.push(safeContent.substring(lastIndex, index));
    }
    
    if (matchText.startsWith('@')) {
      const handle = matchText.substring(1);
      parts.push(
        <Link 
          key={`mention-${idx}`} 
          to={`/${handle}`} 
          className="text-primary hover:underline font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          {matchText}
        </Link>
      );
    } else if (matchText.startsWith('#')) {
      const hashtag = matchText.substring(1);
      parts.push(
        <Link
          key={`hashtag-${idx}`}
          to={`/search?q=${encodeURIComponent(hashtag)}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {matchText}
        </Link>
      );
    } else {
      const url = matchText.startsWith('http') ? matchText : `https://${matchText}`;
      parts.push(
        <a
          key={`url-${idx}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {matchText.length > 50 ? matchText.substring(0, 50) + '...' : matchText}
        </a>
      );
    }
    lastIndex = index + matchText.length;
  });

  if (lastIndex < safeContent.length) {
    parts.push(safeContent.substring(lastIndex));
  }
  return <>{parts}</>;
};

// --- Interfaces ---
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

interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  post_images?: Array<{ image_url: string; display_order: number; alt_text?: string }>;
  post_link_previews?: Array<{
    url: string;
    title?: string | null;
    description?: string | null;
    image_url?: string | null;
    site_name?: string | null;
  }>;
  quoted_post?: {
    id: string;
    content: string;
    created_at: string;
    author_id: string;
    image_url?: string | null;
    post_images?: Array<{ image_url: string; display_order: number; alt_text?: string }>;
    is_developer?: boolean;
    profiles: {
      display_name: string;
      handle: string;
      is_verified: boolean;
      is_organization_verified: boolean;
      avatar_url?: string | null;
    };
  } | null;
  likes_count: number;
  replies_count: number;
  view_count: number;
  author: {
    id: string; 
    display_name: string;
    handle: string;
    is_verified: boolean;
    is_organization_verified: boolean;
    is_warned?: boolean;
    warning_reason?: string | null;
    avatar_url?: string | null;
  };
}

const PostDetail = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const { translateText } = useAITranslation();
  const [translatedPost, setTranslatedPost] = useState<string | null>(null);
  const [translatedReplies, setTranslatedReplies] = useState<Record<string, string>>({});
  const [isTranslatingPost, setIsTranslatingPost] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ replyId: string; authorHandle: string } | null>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [showViewsSheet, setShowViewsSheet] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [postId]);

  useEffect(() => {
    const checkUserInteractions = async () => {
      if (!user || !postId) return;
      const { data } = await supabase
        .from('post_acknowledgments')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsLiked(!!data);
    };
    checkUserInteractions();
  }, [user, postId]);

  const handleLike = useCallback(async () => {
    if (!user) {
      navigate('/auth/signin');
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setPost((prev) =>
      prev ? { ...prev, likes_count: Math.max(0, prev.likes_count + (wasLiked ? -1 : 1)) } : null
    );
    try {
      if (wasLiked) {
        const { error } = await supabase.from('post_acknowledgments').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_acknowledgments').upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
        if (error) throw error;
      }
      const { data: counts } = await supabase.rpc('get_post_like_counts', { post_ids: [postId] });
      if (Array.isArray(counts) && counts[0]?.like_count != null) {
        setPost((prev) => (prev ? { ...prev, likes_count: Number(counts[0].like_count) } : prev));
      }
    } catch (error) {
      setIsLiked(wasLiked);
      setPost((prev) => prev ? { ...prev, likes_count: Math.max(0, prev.likes_count + (wasLiked ? 1 : -1)) } : null);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  }, [user, postId, isLiked, isLiking, navigate]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      navigator.share({ title: post?.author.display_name ? `Post by ${post.author.display_name}` : 'Check out this post', url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  }, [postId, post]);

  const handleRepost = useCallback(async () => {
    if (!user) { navigate('/auth/signin'); return; }
    if (!post) return;
    try {
      const { error } = await supabase.from('posts').insert({ author_id: user.id, content: '', quoted_post_id: post.id });
      if (error) throw error;
      toast.success('Post reposted!');
    } catch (error) {
      toast.error('Failed to repost');
    }
  }, [user, post, navigate]);

  useEffect(() => {
    if (!user || !postRef.current || hasTrackedView || !postId) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView) {
          setHasTrackedView(true);
          try {
            await supabase.from('post_views').insert({ post_id: postId, viewer_id: user.id });
            setPost(prev => prev ? { ...prev, view_count: prev.view_count + 1 } : null);
          } catch (error) {
            console.debug('View already tracked or error:', error);
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(postRef.current);
    return () => observer.disconnect();
  }, [user, postId, hasTrackedView]);

  const organizeReplies = (allReplies: Reply[]): Reply[] => {
    const replyMap = new Map<string, Reply>();
    const rootReplies: Reply[] = [];
    allReplies.forEach(reply => {
      replyMap.set(reply.id, { ...reply, nested_replies: [] });
    });
    allReplies.forEach(reply => {
      const replyWithNested = replyMap.get(reply.id)!;
      if (reply.parent_reply_id) {
        const parent = replyMap.get(reply.parent_reply_id);
        if (parent) {
          parent.nested_replies = parent.nested_replies || [];
          parent.nested_replies.push(replyWithNested);
        } else {
          rootReplies.push(replyWithNested);
        }
      } else {
        rootReplies.push(replyWithNested);
      }
    });
    return rootReplies.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const fetchPostAndReplies = async () => {
    if (!postId) return;
    setLoading(true);
    const postPromise = supabase.from('posts').select(`id, content, created_at, image_url, view_count, quoted_post_id, profiles!inner (id, display_name, handle, is_verified, is_organization_verified, is_warned, warning_reason, avatar_url), post_images(image_url, display_order, alt_text), post_link_previews(url, title, description, image_url, site_name)`).eq('id', postId).single();
    const likesPromise = supabase.rpc('get_post_like_counts', { post_ids: [postId] });
    const repliesCountPromise = supabase.rpc('get_post_reply_counts', { post_ids: [postId] });
    const repliesPromise = supabase.from('post_replies').select(`id, content, created_at, parent_reply_id, is_pinned, pinned_by, pinned_at, profiles!inner (display_name, handle, is_verified, is_organization_verified, avatar_url, is_warned, warning_reason)`).eq('post_id', postId).order('created_at', { ascending: true });

    const [postResult, likesResult, repliesCountResult, repliesResult] = await Promise.all([postPromise, likesPromise, repliesCountPromise, repliesPromise]);
    if (postResult.error) { setLoading(false); return; }

    const postData = postResult.data;
    const likesCount = Array.isArray(likesResult.data) && likesResult.data[0]?.like_count != null ? Number(likesResult.data[0].like_count) : 0;
    const repliesCount = Array.isArray(repliesCountResult.data) && repliesCountResult.data[0]?.reply_count != null ? Number(repliesCountResult.data[0].reply_count) : (repliesResult.data?.length || 0);

    let quotedPost = null;
    if (postData.quoted_post_id) {
      const { data: qd } = await supabase.from('posts').select(`id, content, created_at, author_id, image_url, post_images(image_url, display_order, alt_text), profiles(display_name, handle, is_verified, is_organization_verified, avatar_url)`).eq('id', postData.quoted_post_id).single();
      if (qd) {
        const { data: dev } = await supabase.from('developer_roles').select('user_id').eq('user_id', qd.author_id).maybeSingle();
        quotedPost = { ...qd, is_developer: !!dev };
      }
    }

    setPost({
      id: postData.id, content: postData.content, created_at: postData.created_at, image_url: postData.image_url || null, post_images: postData.post_images || [], post_link_previews: postData.post_link_previews || [],
      quoted_post: quotedPost, likes_count: likesCount, replies_count: repliesCount, view_count: postData.view_count || 0,
      author: { id: postData.profiles.id, display_name: postData.profiles.display_name, handle: postData.profiles.handle, is_verified: postData.profiles.is_verified, is_organization_verified: postData.profiles.is_organization_verified, is_warned: postData.profiles.is_warned, warning_reason: postData.profiles.warning_reason, avatar_url: postData.profiles.avatar_url }
    });

    if (repliesResult.data) {
      const mapped = repliesResult.data.map((r: any) => ({
        id: r.id, content: r.content, created_at: r.created_at, parent_reply_id: r.parent_reply_id, is_pinned: r.is_pinned, pinned_by: r.pinned_by, pinned_at: r.pinned_at,
        author: { display_name: r.profiles.display_name, handle: r.profiles.handle, is_verified: r.profiles.is_verified, is_organization_verified: r.profiles.is_organization_verified, avatar_url: r.profiles.avatar_url, is_warned: r.profiles.is_warned, warning_reason: r.profiles.warning_reason }
      }));
      setReplies(organizeReplies(mapped));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPostAndReplies();
  }, [postId]);

  const handleTranslatePost = async () => {
    if (!post) return;
    if (translatedPost) { setTranslatedPost(null); return; }
    setIsTranslatingPost(true);
    const translated = await translateText(post.content, i18n.language);
    setTranslatedPost(translated);
    setIsTranslatingPost(false);
  };

  const handleTranslateReply = async (replyId: string, content: string) => {
    if (translatedReplies[replyId]) {
      const newTranslated = { ...translatedReplies };
      delete newTranslated[replyId];
      setTranslatedReplies(newTranslated);
      return;
    }
    const translated = await translateText(content, i18n.language);
    setTranslatedReplies(prev => ({ ...prev, [replyId]: translated }));
  };

  const handlePinReply = async (replyId: string, currentPinnedState: boolean) => {
    if (!user || !post || user.id !== post.author.id) { toast.error('Only post authors can pin comments'); return; }
    const { error } = await supabase.from('post_replies').update({ is_pinned: !currentPinnedState, pinned_by: !currentPinnedState ? user.id : null, pinned_at: !currentPinnedState ? new Date().toISOString() : null }).eq('id', replyId);
    if (error) { toast.error('Failed to update pin status'); return; }
    toast.success(currentPinnedState ? 'Comment unpinned' : 'Comment pinned');
    fetchPostAndReplies();
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!user) return;
    const { error } = await supabase.from('post_replies').delete().eq('id', replyId);
    if (error) { toast.error('Failed to delete comment'); return; }
    toast.success('Comment deleted');
    setReplies(prev => prev.filter(r => r.id !== replyId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <PageSkeleton variant="centered" />;
  if (!post) return (
    <div className="p-4 text-center min-h-screen">
      <h1 className="text-2xl font-bold">Post not found</h1>
      <Button onClick={() => navigate(-1)} variant="link">Go Back</Button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background border-x border-border max-w-2xl mx-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">Post</h2>
        </div>
      </div>

      {/* Main Content Body */}
      <div ref={postRef} className="flex-1 overflow-y-auto pb-10">
        <article className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to={`/${post.author.handle}`}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.author.avatar_url ?? undefined} />
                  <AvatarFallback>{post.author.display_name[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-bold">{post.author.display_name}</span>
                  <VerifiedBadge isVerified={post.author.is_verified} isOrg={post.author.is_organization_verified} />
                </div>
                <span className="text-muted-foreground text-sm">@{post.author.handle}</span>
              </div>
            </div>
            {user?.id === post.author.id && (
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="text-[1.35rem] leading-snug mb-4 break-words">
            {renderContentWithMentions(translatedPost || post.content)}
            {post.author.is_warned && <WarningBadge reason={post.author.warning_reason} />}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary h-7 px-2 mb-4" 
            onClick={handleTranslatePost}
            disabled={isTranslatingPost}
          >
            {isTranslatingPost ? 'Translating...' : translatedPost ? 'Show Original' : 'Translate Post'}
          </Button>

          {post.post_images && post.post_images.length > 0 && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-border">
              <ImageCarousel images={post.post_images.map(img => img.image_url)} />
            </div>
          )}

          {post.post_link_previews?.map((preview, idx) => (
            <div key={idx} className="mb-4">
              <LinkPreviewCard {...preview} />
            </div>
          ))}

          {post.quoted_post && (
            <div className="mb-4">
              <QuotedPostCard post={post.quoted_post} />
            </div>
          )}

          <div className="text-muted-foreground py-3 border-b border-border text-[0.95rem]">
            {formatDate(post.created_at)}
          </div>

          <div className="flex items-center gap-6 py-4 border-b border-border text-sm">
            <button onClick={() => setShowViewsSheet(true)} className="hover:underline flex items-center gap-1">
              <span className="font-bold">{post.view_count}</span>
              <span className="text-muted-foreground">Views</span>
            </button>
            <div className="flex items-center gap-1">
              <span className="font-bold">{post.likes_count}</span>
              <span className="text-muted-foreground">Likes</span>
            </div>
          </div>

          <div className="flex items-center justify-around py-2 border-b border-border">
            <Button variant="ghost" size="sm" className="text-muted-foreground"><MessageCircle className="h-5 w-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleRepost} className="text-muted-foreground hover:text-green-500"><Repeat2 className="h-5 w-5" /></Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike} 
              className={cn(isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500")}
            >
              <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground"><Send className="h-5 w-5" /></Button>
          </div>
        </article>

        <div className="px-4 py-2 border-b border-border">
          <CommentInput postId={post.id} onSuccess={fetchPostAndReplies} />
        </div>

        <div className="divide-y divide-border">
          {replies.map((reply) => (
            <NestedReplyItem 
              key={reply.id} 
              reply={reply} 
              postAuthorId={post.author.id}
              onDelete={handleDeleteReply}
              onPin={handlePinReply}
            />
          ))}
        </div>
      </div>

      <EditPostModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} post={post} />
      <ViewsAnalyticsSheet isOpen={showViewsSheet} onClose={() => setShowViewsSheet(false)} postId={post.id} />
      <FloatingActionButton />
    </div>
  );
};

export default PostDetail;
