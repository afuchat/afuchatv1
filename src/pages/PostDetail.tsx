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

// --- Text Utility ---
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
      parts.push(<Link key={`m-${idx}`} to={`/${matchText.substring(1)}`} className="text-primary hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>{matchText}</Link>);
    } else if (matchText.startsWith('#')) {
      parts.push(<Link key={`h-${idx}`} to={`/search?q=${encodeURIComponent(matchText.substring(1))}`} className="text-primary hover:underline font-medium" onClick={(e) => e.stopPropagation()}>{matchText}</Link>);
    } else {
      const url = matchText.startsWith('http') ? matchText : `https://${matchText}`;
      parts.push(<a key={`u-${idx}`} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{matchText.length > 50 ? matchText.substring(0, 50) + '...' : matchText}</a>);
    }
    lastIndex = index + matchText.length;
  });
  if (lastIndex < safeContent.length) parts.push(safeContent.substring(lastIndex));
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
  post_link_previews?: Array<{ url: string; title?: string | null; description?: string | null; image_url?: string | null; site_name?: string | null; }>;
  quoted_post?: any;
  likes_count: number;
  replies_count: number;
  view_count: number;
  author: {
    id: string; display_name: string; handle: string; is_verified: boolean; is_organization_verified: boolean; is_warned?: boolean; warning_reason?: string | null; avatar_url?: string | null;
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
  const postRef = useRef<HTMLDivElement>(null);

  // --- Reply Organizer Logic ---
  const organizeReplies = (allReplies: Reply[]): Reply[] => {
    const replyMap = new Map<string, Reply>();
    const rootReplies: Reply[] = [];
    allReplies.forEach(r => replyMap.set(r.id, { ...r, nested_replies: [] }));
    allReplies.forEach(reply => {
      const node = replyMap.get(reply.id)!;
      if (reply.parent_reply_id) {
        const parent = replyMap.get(reply.parent_reply_id);
        if (parent) parent.nested_replies?.push(node);
        else rootReplies.push(node);
      } else {
        rootReplies.push(node);
      }
    });
    return rootReplies.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const fetchData = useCallback(async () => {
    if (!postId) return;
    try {
      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .select(`*, profiles!inner (*), post_images(*), post_link_previews(*)`)
        .eq('id', postId)
        .single();

      if (postErr) throw postErr;

      const { data: likes } = await supabase.rpc('get_post_like_counts', { post_ids: [postId] });
      const { data: repliesResult } = await supabase
        .from('post_replies')
        .select(`*, profiles!inner (*)`)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      setPost({
        ...postData,
        likes_count: likes?.[0]?.like_count || 0,
        author: postData.profiles,
      });

      if (repliesResult) {
        const mapped = repliesResult.map((r: any) => ({
          ...r,
          author: r.profiles // Map profile to author object
        }));
        setReplies(organizeReplies(mapped));
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading post content");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
    window.scrollTo(0, 0);
  }, [fetchData]);

  const handleLike = async () => {
    if (!user) return navigate('/auth/signin');
    if (isLiking || !post) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setPost(p => p ? { ...p, likes_count: p.likes_count + (wasLiked ? -1 : 1) } : null);
    try {
      if (wasLiked) await supabase.from('post_acknowledgments').delete().eq('post_id', postId).eq('user_id', user.id);
      else await supabase.from('post_acknowledgments').upsert({ post_id: postId, user_id: user.id });
    } catch { setIsLiked(wasLiked); }
    finally { setIsLiking(false); }
  };

  const handleDeleteReply = async (replyId: string) => {
    const { error } = await supabase.from('post_replies').delete().eq('id', replyId);
    if (!error) {
      toast.success("Comment deleted");
      fetchData();
    }
  };

  const handlePinReply = async (replyId: string, currentStatus: boolean) => {
    if (user?.id !== post?.author.id) return;
    const { error } = await supabase.from('post_replies').update({
      is_pinned: !currentStatus,
      pinned_by: !currentStatus ? user?.id : null
    }).eq('id', replyId);
    if (!error) fetchData();
  };

  if (loading) return <PageSkeleton variant="centered" />;
  if (!post) return <div className="p-10 text-center">Post missing</div>;

  return (
    <div className="flex flex-col min-h-screen bg-background border-x border-border max-w-2xl mx-auto">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">Post</h2>
      </header>

      <main className="flex-1 overflow-y-auto pb-10">
        <article ref={postRef} className="p-4 border-b border-border">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarImage src={post.author.avatar_url || ''} /><AvatarFallback>{post.author.display_name?.[0]}</AvatarFallback></Avatar>
              <div>
                <div className="flex items-center gap-1 font-bold">
                  {post.author.display_name}
                  <VerifiedBadge isVerified={post.author.is_verified} isOrg={post.author.is_organization_verified} />
                </div>
                <div className="text-muted-foreground text-sm">@{post.author.handle}</div>
              </div>
            </div>
            {user?.id === post.author.id && <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}><Pencil className="h-4 w-4" /></Button>}
          </div>

          {/* Content */}
          <div className="text-[1.3rem] leading-snug mb-4">
            {renderContentWithMentions(translatedPost || post.content)}
            {post.author.is_warned && <WarningBadge reason={post.author.warning_reason} />}
          </div>

          {/* Images/Previews */}
          {post.post_images && post.post_images.length > 0 && <div className="mb-4 rounded-xl overflow-hidden"><ImageCarousel images={post.post_images.map(i => i.image_url)} /></div>}
          {post.post_link_previews?.map((p, i) => <LinkPreviewCard key={i} {...p} />)}

          <div className="flex gap-4 py-4 border-y border-border text-sm my-4">
            <button onClick={() => setShowViewsSheet(true)}><strong>{post.view_count}</strong> Views</button>
            <span><strong>{post.likes_count}</strong> Likes</span>
          </div>

          <div className="flex justify-around py-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground"><MessageCircle className="h-5 w-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLike} className={isLiked ? "text-red-500" : ""}><Heart className={cn("h-5 w-5", isLiked && "fill-current")} /></Button>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Copied!"); }}><Send className="h-5 w-5" /></Button>
          </div>
        </article>

        {/* --- Comment Section --- */}
        <div className="p-4 border-b border-border">
          <CommentInput postId={post.id} onSuccess={fetchData} />
        </div>

        <div className="divide-y divide-border">
          {replies.length > 0 ? (
            replies.map((reply) => (
              <NestedReplyItem 
                key={reply.id} 
                reply={reply} 
                postAuthorId={post.author.id}
                onDelete={handleDeleteReply}
                onPin={handlePinReply}
              />
            ))
          ) : (
            <div className="p-10 text-center text-muted-foreground">No comments yet. Be the first to reply!</div>
          )}
        </div>
      </main>

      <EditPostModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} post={post} />
      <ViewsAnalyticsSheet isOpen={showViewsSheet} onClose={() => setShowViewsSheet(false)} postId={post.id} />
      <FloatingActionButton />
    </div>
  );
};

export default PostDetail;
