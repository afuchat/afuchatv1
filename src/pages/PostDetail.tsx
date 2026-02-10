import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageSkeleton } from '@/components/skeletons';
import { MessageCircle, Heart, Pencil, Share, Repeat2, ArrowLeft, Languages } from 'lucide-react';
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
    if (index > lastIndex) parts.push(safeContent.substring(lastIndex, index));
    
    if (matchText.startsWith('@')) {
      const handle = matchText.substring(1);
      parts.push(<Link key={`mention-${idx}`} to={`/${handle}`} className="text-primary hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>{matchText}</Link>);
    } else if (matchText.startsWith('#')) {
      const hashtag = matchText.substring(1);
      parts.push(<Link key={`hashtag-${idx}`} to={`/search?q=${encodeURIComponent(hashtag)}`} className="text-primary hover:underline font-medium" onClick={(e) => e.stopPropagation()}>{matchText}</Link>);
    } else {
      const url = matchText.startsWith('http') ? matchText : `https://${matchText}`;
      parts.push(<a key={`url-${idx}`} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{matchText.length > 50 ? matchText.substring(0, 50) + '...' : matchText}</a>);
    }
    lastIndex = index + matchText.length;
  });
  if (lastIndex < safeContent.length) parts.push(safeContent.substring(lastIndex));
  return <>{parts}</>;
};

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
  quoted_post?: any;
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
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { translateText } = useAITranslation();

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [translatedPost, setTranslatedPost] = useState<string | null>(null);
  const [isTranslatingPost, setIsTranslatingPost] = useState(false);
  const [showViewsSheet, setShowViewsSheet] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const postRef = useRef<HTMLDivElement>(null);

  // --- Organise Replies Logic ---
  const organizeReplies = (allReplies: Reply[]): Reply[] => {
    const replyMap = new Map<string, Reply>();
    const rootReplies: Reply[] = [];
    allReplies.forEach(reply => replyMap.set(reply.id, { ...reply, nested_replies: [] }));
    allReplies.forEach(reply => {
      const node = replyMap.get(reply.id)!;
      if (reply.parent_reply_id) {
        const parent = replyMap.get(reply.parent_reply_id);
        if (parent) {
          parent.nested_replies = parent.nested_replies || [];
          parent.nested_replies.push(node);
        } else { rootReplies.push(node); }
      } else { rootReplies.push(node); }
    });
    return rootReplies.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // --- Fetch Data ---
  const fetchPostAndReplies = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!inner (id, display_name, handle, is_verified, is_organization_verified, is_warned, warning_reason, avatar_url),
          post_images(image_url, display_order, alt_text),
          post_link_previews(url, title, description, image_url, site_name)
        `)
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      const { data: likesResult } = await supabase.rpc('get_post_like_counts', { post_ids: [postId] });
      const { data: repliesResult } = await supabase
        .from('post_replies')
        .select('*, profiles!inner (display_name, handle, is_verified, is_organization_verified, avatar_url, is_warned, warning_reason)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      // Quoted Post Logic
      let quotedPost = null;
      if (postData.quoted_post_id) {
        const { data: qData } = await supabase.from('posts').select('*, profiles(*)').eq('id', postData.quoted_post_id).single();
        if (qData) quotedPost = { ...qData, author: qData.profiles };
      }

      setPost({
        ...postData,
        quoted_post: quotedPost,
        likes_count: likesResult?.[0]?.like_count || 0,
        author: postData.profiles,
      });

      if (repliesResult) {
        const mapped = repliesResult.map((r: any) => ({ ...r, author: r.profiles }));
        setReplies(organizeReplies(mapped));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostAndReplies();
    window.scrollTo(0, 0);
  }, [fetchPostAndReplies]);

  // --- Interaction Handlers ---
  const handleLike = async () => {
    if (!user) return navigate('/auth/signin');
    if (isLiking || !post) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setPost(prev => prev ? { ...prev, likes_count: Math.max(0, prev.likes_count + (wasLiked ? -1 : 1)) } : null);
    try {
      if (wasLiked) await supabase.from('post_acknowledgments').delete().eq('post_id', postId).eq('user_id', user.id);
      else await supabase.from('post_acknowledgments').upsert({ post_id: postId, user_id: user.id });
    } catch (e) {
      setIsLiked(wasLiked);
      toast.error('Sync error');
    } finally { setIsLiking(false); }
  };

  const handleTranslatePost = async () => {
    if (!post) return;
    if (translatedPost) return setTranslatedPost(null);
    setIsTranslatingPost(true);
    const translated = await translateText(post.content, i18n.language);
    setTranslatedPost(translated);
    setIsTranslatingPost(false);
  };

  const handlePinReply = async (replyId: string, currentPinnedState: boolean) => {
    if (!user || user.id !== post?.author.id) return toast.error('Unauthorized');
    const { error } = await supabase.from('post_replies').update({ 
      is_pinned: !currentPinnedState,
      pinned_by: !currentPinnedState ? user.id : null,
      pinned_at: !currentPinnedState ? new Date().toISOString() : null
    }).eq('id', replyId);
    if (!error) fetchPostAndReplies();
  };

  const handleDeleteReply = async (replyId: string) => {
    const { error } = await supabase.from('post_replies').delete().eq('id', replyId);
    if (!error) setReplies(prev => prev.filter(r => r.id !== replyId));
  };

  if (loading) return <PageSkeleton variant="centered" />;
  if (!post) return <div className="p-4 text-center">Post not found</div>;

  return (
    <div className="flex flex-col min-h-screen bg-background border-x border-border max-w-2xl mx-auto overflow-x-hidden">
      {/* Fixed/Sticky Nav */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold">Post</h2>
      </header>

      {/* Main Content Area - Native Scroll */}
      <main className="flex-1 pb-20">
        <article ref={postRef} className="px-4 pt-4">
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.author.avatar_url ?? undefined} />
                <AvatarFallback>{post.author.display_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-bold">{post.author.display_name}</span>
                  <VerifiedBadge isVerified={post.author.is_verified} isOrg={post.author.is_organization_verified} />
                </div>
                <span className="text-muted-foreground text-sm">@{post.author.handle}</span>
              </div>
            </div>
            {user?.id === post.author.id && (
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}><Pencil className="h-4 w-4" /></Button>
            )}
          </header>

          <div className="text-[1.25rem] leading-snug mb-4 whitespace-pre-wrap">
            {renderContentWithMentions(translatedPost || post.content)}
            {post.author.is_warned && <WarningBadge reason={post.author.warning_reason} />}
          </div>

          <Button variant="ghost" size="sm" className="text-primary text-xs mb-4" onClick={handleTranslatePost} disabled={isTranslatingPost}>
            <Languages className="mr-2 h-4 w-4" /> {translatedPost ? 'Show Original' : 'Translate Post'}
          </Button>

          {post.post_images && post.post_images.length > 0 && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border">
              <ImageCarousel images={post.post_images.map(img => img.image_url)} />
            </div>
          )}

          {post.post_link_previews?.map((preview, i) => (
            <LinkPreviewCard key={i} {...preview} />
          ))}

          {post.quoted_post && <div className="mb-4"><QuotedPostCard post={post.quoted_post} /></div>}

          <div className="text-muted-foreground py-3 border-b border-border text-sm">
            {new Date(post.created_at).toLocaleString()}
          </div>

          <div className="flex items-center gap-6 py-4 border-b border-border">
            <button onClick={() => setShowViewsSheet(true)} className="hover:underline flex gap-1">
              <span className="font-bold">{post.view_count}</span> <span className="text-muted-foreground">Views</span>
            </button>
            <div className="flex gap-1">
              <span className="font-bold">{post.likes_count}</span> <span className="text-muted-foreground">Likes</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-around py-2 border-b border-border">
            <Button variant="ghost" size="sm" className="text-muted-foreground"><MessageCircle className="h-5 w-5" /></Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground"><Repeat2 className="h-5 w-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLike} className={cn(isLiked ? "text-red-500" : "text-muted-foreground")}>
              <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}><Share className="h-5 w-5" /></Button>
          </div>
        </article>

        {/* Comment Input */}
        <div className="p-4 border-b border-border">
          <CommentInput postId={post.id} onSuccess={fetchPostAndReplies} />
        </div>

        {/* Replies Section */}
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
      </main>

      <EditPostModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} post={post} />
      <ViewsAnalyticsSheet isOpen={showViewsSheet} onClose={() => setShowViewsSheet(false)} postId={post.id} />
    </div>
  );
};

export default PostDetail;
