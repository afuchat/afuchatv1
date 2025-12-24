import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageSkeleton } from '@/components/skeletons';
import { ArrowLeft, TrendingUp, MessageCircle, Heart } from 'lucide-react';
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


// --- Utility to render text with clickable mentions, hashtags, and links ---
const renderContentWithMentions = (content: string) => {
  // Ensure content is a string
  const safeContent = typeof content === 'string' ? content : String(content || '');
  
  // Parse mentions, hashtags, and links (including plain domains like dev-write.netlify.app)
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
      // It's a URL (either with http/https or a plain domain)
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

// --- Reply Interface (NEW) ---
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

// Define the main Post type
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
  const [replies, setReplies] = useState<Reply[]>([]); // NEW state for replies
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

  // Track post view when it becomes visible
  useEffect(() => {
    if (!user || !postRef.current || hasTrackedView || !postId) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView) {
          setHasTrackedView(true);
          
          // Track the view in the database
          try {
            await supabase
              .from('post_views')
              .insert({
                post_id: postId,
                viewer_id: user.id,
              });
            
            // Update local view count
            setPost(prev => prev ? { ...prev, view_count: prev.view_count + 1 } : null);
          } catch (error) {
            // Silently fail if view already exists
            console.debug('View already tracked or error:', error);
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(postRef.current);

    return () => observer.disconnect();
  }, [user, postId, hasTrackedView]);

  useEffect(() => {
    if (!postId) return;

    const fetchPostAndReplies = async () => {
      setLoading(true);
      
      const postPromise = supabase
        .from('posts')
        .select(`
          id, content, created_at, image_url, view_count, quoted_post_id,
          profiles!inner (id, display_name, handle, is_verified, is_organization_verified, is_warned, warning_reason, avatar_url),
          post_images(image_url, display_order, alt_text),
          post_link_previews(url, title, description, image_url, site_name)
        `)
        .eq('id', postId)
        .single();

      const likesPromise = supabase
        .from('post_acknowledgments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);

      const repliesPromise = supabase
        .from('post_replies')
        .select(`
          id, content, created_at, parent_reply_id, is_pinned, pinned_by, pinned_at,
          profiles!inner (display_name, handle, is_verified, is_organization_verified, avatar_url, is_warned, warning_reason)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      const [postResult, likesResult, repliesResult] = await Promise.all([postPromise, likesPromise, repliesPromise]);

      if (postResult.error) {
        console.error('Error fetching post:', postResult.error);
        setLoading(false);
        return;
      }

      const postData = postResult.data;
      const likesCount = likesResult.count || 0;
      const repliesCount = repliesResult.data?.length || 0;

      // Fetch quoted post if exists
      let quotedPost = null;
      if (postData.quoted_post_id) {
        const { data: quotedPostData } = await supabase
          .from('posts')
          .select(`
            id, content, created_at, author_id, image_url,
            post_images(image_url, display_order, alt_text),
            profiles(display_name, handle, is_verified, is_organization_verified, avatar_url)
          `)
          .eq('id', postData.quoted_post_id)
          .single();
        
        if (quotedPostData) {
          quotedPost = quotedPostData;
        }
      }

      setPost({
        id: postData.id,
        content: postData.content,
        created_at: postData.created_at,
        image_url: postData.image_url || null,
        post_images: postData.post_images || [],
        post_link_previews: postData.post_link_previews || [],
        quoted_post: quotedPost,
        likes_count: likesCount,
        replies_count: repliesCount,
        view_count: postData.view_count || 0,
        author: {
          id: postData.profiles.id,
          display_name: postData.profiles.display_name,
          handle: postData.profiles.handle,
          is_verified: postData.profiles.is_verified,
          is_organization_verified: postData.profiles.is_organization_verified,
          is_warned: postData.profiles.is_warned,
          warning_reason: postData.profiles.warning_reason,
          avatar_url: postData.profiles.avatar_url,
        },
      });

      if (repliesResult.data) {
        const mappedReplies: Reply[] = repliesResult.data.map((r: any) => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          parent_reply_id: r.parent_reply_id,
          is_pinned: r.is_pinned,
          pinned_by: r.pinned_by,
          pinned_at: r.pinned_at,
          author: {
            display_name: r.profiles.display_name,
            handle: r.profiles.handle,
            is_verified: r.profiles.is_verified,
            is_organization_verified: r.profiles.is_organization_verified,
            avatar_url: r.profiles.avatar_url,
            is_warned: r.profiles.is_warned,
            warning_reason: r.profiles.warning_reason,
          },
        }));
        const organizedReplies = organizeReplies(mappedReplies);
        setReplies(organizedReplies);
      }

      setLoading(false);
    };

    fetchPostAndReplies();
  }, [postId]);

  const handleTranslatePost = async () => {
    if (!post) return;
    
    if (translatedPost) {
      setTranslatedPost(null);
      return;
    }

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

    // Sort: pinned first, then by date
    return rootReplies.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const handlePinReply = async (replyId: string, currentPinnedState: boolean) => {
    if (!user || !post || user.id !== post.author.id) {
      toast.error('Only post authors can pin comments');
      return;
    }

    const { error } = await supabase
      .from('post_replies')
      .update({ 
        is_pinned: !currentPinnedState,
        pinned_by: !currentPinnedState ? user.id : null,
        pinned_at: !currentPinnedState ? new Date().toISOString() : null
      })
      .eq('id', replyId);

    if (error) {
      toast.error('Failed to update pin status');
      return;
    }

    toast.success(currentPinnedState ? 'Comment unpinned' : 'Comment pinned');
    
    // Refresh replies
    const { data } = await supabase
      .from('post_replies')
      .select('*, profiles!inner(display_name, handle, is_verified, is_organization_verified, avatar_url, is_warned, warning_reason)')
      .eq('post_id', postId);
    
    if (data) {
      const mappedReplies: Reply[] = data.map((r: any) => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        parent_reply_id: r.parent_reply_id,
        is_pinned: r.is_pinned,
        pinned_by: r.pinned_by,
        pinned_at: r.pinned_at,
        author: {
          display_name: r.profiles.display_name,
          handle: r.profiles.handle,
          is_verified: r.profiles.is_verified,
          is_organization_verified: r.profiles.is_organization_verified,
          avatar_url: r.profiles.avatar_url,
          is_warned: r.profiles.is_warned,
          warning_reason: r.profiles.warning_reason,
        },
      }));
      setReplies(organizeReplies(mappedReplies));
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('post_replies')
      .delete()
      .eq('id', replyId);

    if (error) {
      toast.error('Failed to delete comment');
      return;
    }

    toast.success('Comment deleted');
    setReplies(prev => prev.filter(r => r.id !== replyId));
  };

  // Remove auto-translate effect - now translate is manual via button
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + 
           ' · ' + 
           date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <PageSkeleton variant="centered" />;
  }

  if (!post) {
    return (
      <div className="p-4 text-center min-h-screen">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <Button 
          onClick={() => navigate(-1)} 
          variant="link"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div ref={postRef} className="min-h-screen bg-background border-x border-border max-w-2xl mx-auto flex flex-col">
      <div className="flex-1">
        
        {/* --- MAIN POST CONTENT --- */}
        <div className="p-4 border-b border-border">
            {/* AUTHOR BLOCK */}
            <div className="flex items-center gap-3 mb-4">
              <Link to={`/${post.author.handle}`}>
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={post.author.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {post.author.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link to={`/${post.author.handle}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold hover:underline truncate">
                    {post.author.display_name}
                  </span>
                  <VerifiedBadge 
                    isVerified={post.author.is_verified} 
                    isOrgVerified={post.author.is_organization_verified} 
                  />
                  {post.author.is_warned && (
                    <WarningBadge size="sm" reason={post.author.warning_reason} variant="post" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{post.author.handle}</p>
              </Link>
            </div>

            {/* POST TEXT */}
            <p className="text-2xl leading-relaxed whitespace-pre-wrap mb-4">
              {renderContentWithMentions(translatedPost || post.content)}
            </p>
            {/* POST IMAGE */}
            {((post.post_images && post.post_images.length > 0) || post.image_url) && (
              <ImageCarousel
                images={
                  post.post_images && post.post_images.length > 0
                    ? post.post_images
                        .sort((a, b) => a.display_order - b.display_order)
                        .map(img => ({ url: img.image_url, alt: img.alt_text || 'Post image' }))
                    : post.image_url 
                      ? [{ url: post.image_url, alt: 'Post image' }] 
                      : []
                }
                className="mb-4"
              />
            )}

            {/* Quoted Post */}
            {post.quoted_post && (
              <QuotedPostCard quotedPost={post.quoted_post} className="mb-4" />
            )}
            
            {post.post_link_previews && post.post_link_previews.length > 0 && (
              <div className="mb-4 space-y-2">
                {post.post_link_previews.map((preview, index) => (
                  <LinkPreviewCard
                    key={index}
                    url={preview.url}
                    title={preview.title}
                    description={preview.description}
                    image_url={preview.image_url}
                    site_name={preview.site_name}
                  />
                ))}
              </div>
            )}
            
            {i18n.language !== 'en' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTranslatePost}
                disabled={isTranslatingPost}
                className="text-xs text-muted-foreground hover:text-primary mb-3 p-0 h-auto"
              >
                {isTranslatingPost ? t('common.translating') : translatedPost ? t('common.showOriginal') : t('common.translate')}
              </Button>
            )}

            {/* TIME & DATE */}
            <p className="text-sm text-muted-foreground border-b border-border pb-3 mb-3">
              {formatDate(post.created_at)}
            </p>

            {/* STATS SECTION - Interactive buttons */}
            <div className="flex items-center gap-6 py-3 border-t border-border">
                <button className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors">
                  <Heart className="h-5 w-5" />
                  <span className="text-sm font-semibold">{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">{post.replies_count}</span>
                </button>
                <button 
                  onClick={() => setShowViewsSheet(true)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm font-semibold">{post.view_count}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors ml-auto">
                  <MessageCircle className="h-5 w-5" />
                </button>
            </div>
        </div>

        {/* --- REPLY INPUT SECTION --- */}
        <CommentInput
          postId={postId || ''}
          replyingTo={replyingTo}
          postAuthorHandle={post?.author.handle}
          onCancelReply={() => setReplyingTo(null)}
          onCommentSubmitted={async () => {
            // Refresh replies
            const { data } = await supabase
              .from('post_replies')
              .select('*, profiles!inner(display_name, handle, is_verified, is_organization_verified, avatar_url)')
              .eq('post_id', postId);
            
            if (data) {
              const mappedReplies: Reply[] = data.map((r: any) => ({
                id: r.id,
                content: r.content,
                created_at: r.created_at,
                parent_reply_id: r.parent_reply_id,
                is_pinned: r.is_pinned,
                pinned_by: r.pinned_by,
                pinned_at: r.pinned_at,
                author: {
                  display_name: r.profiles.display_name,
                  handle: r.profiles.handle,
                  is_verified: r.profiles.is_verified,
                  is_organization_verified: r.profiles.is_organization_verified,
                  avatar_url: r.profiles.avatar_url,
                },
              }));
              setReplies(organizeReplies(mappedReplies));
              setPost(prev => prev ? { ...prev, replies_count: prev.replies_count + 1 } : null);
            }
          }}
        />

        {/* --- REPLIES LIST --- */}
        <div className="flex flex-col">
            {/* Comments header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h3 className="font-extrabold text-xl">Comments</h3>
              {replies.length > 0 && (
                <span className="text-base font-semibold text-muted-foreground">({replies.length})</span>
              )}
            </div>
            
            <div className="divide-y divide-border">
              {replies.map(reply => (
                <NestedReplyItem
                  key={reply.id}
                  reply={reply}
                  postId={postId || ''}
                  depth={0}
                  onTranslate={handleTranslateReply}
                  translatedReplies={translatedReplies}
                  onReplyClick={(replyId, authorHandle) => {
                    setReplyingTo({ replyId, authorHandle });
                  }}
                  onPinReply={handlePinReply}
                  onDeleteReply={handleDeleteReply}
                  isPostAuthor={user?.id === post?.author.id}
                  currentUserId={user?.id}
                  VerifiedBadge={VerifiedBadge}
                  renderContentWithMentions={renderContentWithMentions}
                  onCommentSubmitted={async () => {
                    // Refresh replies
                    const { data } = await supabase
                      .from('post_replies')
                      .select('*, profiles!inner(display_name, handle, is_verified, is_organization_verified, avatar_url)')
                      .eq('post_id', postId);
                    
                    if (data) {
                      const mappedReplies: Reply[] = data.map((r: any) => ({
                        id: r.id,
                        content: r.content,
                        created_at: r.created_at,
                        parent_reply_id: r.parent_reply_id,
                        is_pinned: r.is_pinned,
                        pinned_by: r.pinned_by,
                        pinned_at: r.pinned_at,
                        author: {
                          display_name: r.profiles.display_name,
                          handle: r.profiles.handle,
                          is_verified: r.profiles.is_verified,
                          is_organization_verified: r.profiles.is_organization_verified,
                          avatar_url: r.profiles.avatar_url,
                        },
                      }));
                      setReplies(organizeReplies(mappedReplies));
                      setPost(prev => prev ? { ...prev, replies_count: prev.replies_count + 1 } : null);
                    }
                  }}
                />
              ))}
            </div>
            
            {replies.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No comments yet</p>
                <p className="text-sm text-muted-foreground/70">Be the first to share your thoughts!</p>
              </div>
            )}
        </div>
      </div>

      <ViewsAnalyticsSheet
        postId={postId || ''}
        isOpen={showViewsSheet}
        onClose={() => setShowViewsSheet(false)}
        totalViews={post?.view_count || 0}
        isPostOwner={user?.id === post?.author.id}
      />
    </div>
  );
};

export default PostDetail;
