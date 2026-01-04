import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageCircle, Heart, Send, Ellipsis, Gift, Eye, TrendingUp, Crown, Users } from 'lucide-react';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import platformLogo from '@/assets/ai-chat-icon.ico';
import aiSparkIcon from '@/assets/ai-chat-icon.ico';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';

import { InlineSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { useNexa } from '@/hooks/useNexa';
import { useAITranslation } from '@/hooks/useAITranslation';
import PostActionsSheet from '@/components/PostActionsSheet';
import DeletePostSheet from '@/components/DeletePostSheet';
import ReportPostSheet from '@/components/ReportPostSheet';
import { EditPostModal } from '@/components/EditPostModal';
import NewPostModal from '@/components/ui/NewPostModal';
import { FeedNestedReplyItem } from '@/components/feed/FeedNestedReplyItem';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendGiftDialog } from '@/components/gifts/SendGiftDialog';
import { ReadMoreText } from '@/components/ui/ReadMoreText';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { LinkPreviewCard } from '@/components/ui/LinkPreviewCard';
import { MentionInput } from '@/components/MentionInput';
import { CommentInput } from '@/components/feed/CommentInput';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { BusinessBadge } from '@/components/BusinessBadge';
import { AffiliatedBadge } from '@/components/AffiliatedBadge';
import { WarningBadge } from '@/components/WarningBadge';
import { OnlineStatus } from '@/components/OnlineStatus';
import { StoryAvatar } from '@/components/moments/StoryAvatar';
import { ViewsAnalyticsSheet } from '@/components/ViewsAnalyticsSheet';
import { SEO } from '@/components/SEO';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { QuotedPostCard } from '@/components/feed/QuotedPostCard';
import { cn } from '@/lib/utils';
import { AIPostSummary } from '@/components/feed/AIPostSummary';

import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { SubscriptionExpiryBanner } from '@/components/SubscriptionExpiryBanner';
import { ChristmasGiftsBanner } from '@/components/home/ChristmasGiftsBanner';
import { UnclaimedRedEnvelopeBanner } from '@/components/home/UnclaimedRedEnvelopeBanner';
// --- INTERFACES ---

// NEW: Define AuthUser interface for type safety (must match the one in PostActionsSheet.tsx)
interface AuthUser {
    id: string;
    user_metadata: {
        display_name?: string;
        handle?: string;
        is_verified?: boolean;
        is_organization_verified?: boolean;
    }
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  image_url: string | null;
  quoted_post_id?: string | null;
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
  post_images?: Array<{ image_url: string; display_order: number; alt_text?: string }>;
  post_link_previews?: Array<{
    url: string;
    title?: string | null;
    description?: string | null;
    image_url?: string | null;
    site_name?: string | null;
  }>;
  profiles: {
    display_name: string;
    handle: string;
    is_verified: boolean;
    is_organization_verified: boolean;
    is_affiliate: boolean;
    is_business_mode?: boolean;
    avatar_url?: string | null;
    affiliated_business_id?: string | null;
    affiliated_business?: {
      avatar_url: string | null;
      display_name: string;
    } | null;
    last_seen?: string | null;
    show_online_status?: boolean;
    is_warned?: boolean;
    warning_reason?: string | null;
    verification_source?: 'manual' | 'premium' | null;
  };
  replies: Reply[];
  like_count: number;
  reply_count: number;
  view_count: number;
  has_liked: boolean;
  affiliation_date?: string;
  is_developer?: boolean;
}

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
    is_affiliate: boolean;
    is_business_mode?: boolean;
    avatar_url?: string | null;
    affiliated_business_id?: string | null;
    affiliated_business?: {
      avatar_url: string | null;
      display_name: string;
    } | null;
    last_seen?: string | null;
    show_online_status?: boolean;
    is_warned?: boolean;
    warning_reason?: string | null;
    verification_source?: 'manual' | 'premium' | null;
  };
  affiliation_date?: string;
  is_developer?: boolean;
}


// --- UTILITY FUNCTIONS (Unchanged) ---
const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const parsePostContent = (content: string, postId: string, navigate: ReturnType<typeof useNavigate>) => {
  // Ensure content is a string
  const safeContent = typeof content === 'string' ? content : String(content || '');
  
  const lookupAndNavigateByHandle = async (handle: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', handle)
      .single();

    if (error || !data) {
      toast.error(`Could not find profile for @${handle}`);
      console.error(error);
      return;
    }

    navigate(`/profile/${data.id}`); 
  };
  
  // First process mentions, then process hashtags and links (including plain domains like dev-write.netlify.app)
  const combinedRegex = /(@[a-zA-Z0-9_-]+|#\w+|https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?)/g;
  const parts: (string | JSX.Element)[] = [];
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
      const MentionComponent = (
        <span
          key={`mention-${idx}`}
          className="text-blue-500 font-medium cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation(); 
            lookupAndNavigateByHandle(handle); 
          }}
        >
          {matchText}
        </span>
      );
      parts.push(MentionComponent);
    } else if (matchText.startsWith('#')) {
      const hashtag = matchText.substring(1);
      parts.push(
        <Link
          key={`hashtag-${idx}`}
          to={`/search?q=${encodeURIComponent(hashtag)}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => {
            e.stopPropagation();
          }}
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
          onClick={(e) => {
            e.stopPropagation();
          }}
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

// Avatar Display Components
const UserAvatarSmall = ({ 
  userId, 
  name, 
  avatarUrl, 
  lastSeen, 
  showOnlineStatus,
  isBusiness = false
}: { 
  userId: string; 
  name: string; 
  avatarUrl?: string | null;
  lastSeen?: string | null;
  showOnlineStatus?: boolean;
  isBusiness?: boolean;
}) => {
  return (
    <div className="relative">
      <StoryAvatar 
        userId={userId}
        avatarUrl={avatarUrl}
        name={name}
        size="sm"
        showStoryRing={true}
        isBusiness={isBusiness}
      />
      <OnlineStatus 
        lastSeen={lastSeen} 
        showOnlineStatus={showOnlineStatus}
        className="w-2 h-2"
      />
    </div>
  );
};

const UserAvatarMedium = ({ 
  userId, 
  name, 
  avatarUrl, 
  lastSeen, 
  showOnlineStatus,
  isBusiness = false
}: { 
  userId: string; 
  name: string; 
  avatarUrl?: string | null;
  lastSeen?: string | null;
  showOnlineStatus?: boolean;
  isBusiness?: boolean;
}) => {
  return (
    <div className="relative">
      <StoryAvatar 
        userId={userId}
        avatarUrl={avatarUrl}
        name={name}
        size="md"
        showStoryRing={true}
        isBusiness={isBusiness}
      />
      <OnlineStatus 
        lastSeen={lastSeen}
        showOnlineStatus={showOnlineStatus}
        className="w-2.5 h-2.5"
      />
    </div>
  );
};

// --- REPLY ITEM (Unchanged) ---

// --- REPLY ITEM (Updated with auto-translation) ---

const ReplyItem = ({ reply, navigate, handleViewProfile }: { 
  reply: Reply; 
  navigate: any; 
  handleViewProfile: (id: string) => void;
}) => {
    const { i18n, t } = useTranslation();
    const { translateText } = useAITranslation();
    const [translatedContent, setTranslatedContent] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    const handleTranslate = async () => {
        if (translatedContent) {
            setTranslatedContent(null);
            return;
        }
        setIsTranslating(true);
        const translated = await translateText(reply.content, i18n.language);
        setTranslatedContent(translated);
        setIsTranslating(false);
    };

    const displayContent = translatedContent || reply.content;

    return (
        <div className="flex pt-2 pb-1 relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-muted ml-px mt-2.5 mb-1.5" />
            
            <div
                className="mr-1.5 sm:mr-2 flex-shrink-0 cursor-pointer z-10"
                onClick={() => handleViewProfile(reply.author_id)}
            >
                <UserAvatarSmall 
                  userId={reply.author_id} 
                  name={reply.profiles.display_name}
                  avatarUrl={reply.profiles.avatar_url}
                />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-x-1 min-w-0">
                    <span
                        className="font-bold text-foreground text-xs sm:text-sm cursor-pointer hover:underline truncate max-w-[80px] sm:max-w-[120px]"
                        onClick={() => handleViewProfile(reply.author_id)}
                        title={reply.profiles.display_name}
                    >
                        {reply.profiles.display_name.length > 10 ? `${reply.profiles.display_name.slice(0, 8)}...` : reply.profiles.display_name}
                    </span>
                    
                    {reply.profiles.is_affiliate && reply.profiles.is_business_mode && (
                      <AffiliatedBadge size="sm" />
                    )}
                    
                    {reply.profiles.is_warned && (
                      <WarningBadge size="sm" reason={reply.profiles.warning_reason} variant="post" />
                    )}
                    
                    <VerifiedBadge 
                      isVerified={reply.profiles.is_verified || reply.is_developer}
                      isOrgVerified={reply.profiles.is_organization_verified}
                      isAffiliate={reply.profiles.is_affiliate}
                      isDeveloper={reply.is_developer}
                      affiliateBusinessLogo={reply.profiles.affiliated_business?.avatar_url}
                      affiliateBusinessName={reply.profiles.affiliated_business?.display_name}
                      size="sm"
                      userId={reply.author_id}
                      verificationSource={reply.profiles.verification_source}
                    />
                    {reply.profiles.is_business_mode && !reply.profiles.is_affiliate && (
                      <BusinessBadge size="sm" />
                    )}

                    <span
                        className="text-muted-foreground text-[10px] sm:text-xs hover:underline cursor-pointer truncate flex-shrink min-w-0"
                        onClick={() => handleViewProfile(reply.author_id)}
                    >
                        @{reply.profiles.handle}
                    </span>
                    <span className="text-muted-foreground text-[10px] sm:text-xs flex-shrink-0">·</span>
                    <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0">
                      {formatTime(reply.created_at)}
                    </span>
                </div>

                <p className="text-foreground text-xs leading-snug whitespace-pre-wrap break-words mt-0.5">
                    {parsePostContent(displayContent, reply.id, navigate)}
                </p>
                {i18n.language !== 'en' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleTranslate}
                        disabled={isTranslating}
                        className="text-[10px] text-muted-foreground hover:text-primary mt-0.5 p-0 h-auto"
                    >
                        {isTranslating ? t('common.translating') : translatedContent ? t('common.showOriginal') : t('common.translate')}
                    </Button>
                )}
            </div>
        </div>
    );
};


// --- POST CARD (Updated to accept and pass through new props) ---

const PostCard = ({ post, addReply, user, navigate, onAcknowledge, onDeletePost, onReportPost, onEditPost, onQuotePost, onHidePost, userProfile, expandedPosts, setExpandedPosts, guestMode = false }:
  { 
    post: Post;
    addReply: (postId: string, newReply: Reply) => void;
    user: AuthUser | null;
    navigate: any;
    onAcknowledge: (postId: string, hasLiked: boolean) => void;
    onDeletePost: (postId: string) => void;
    onReportPost: (postId: string) => void;
    onEditPost: (postId: string) => void;
    onQuotePost: (post: Post) => void;
    onHidePost: (postId: string) => void;
    userProfile: { display_name: string; avatar_url: string | null } | null;
    expandedPosts: Set<string>;
    setExpandedPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
    guestMode?: boolean;
  }) => {

  const { t, i18n } = useTranslation();
  const { awardNexa } = useNexa();
  const { translateText } = useAITranslation();
  const [showComments, setShowComments] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(5);
  const postRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [showViewsSheet, setShowViewsSheet] = useState(false);

  // Track post view when it becomes visible - optimized to prevent duplicates
  useEffect(() => {
    if (!user || !postRef.current || hasTrackedView) return;
    
    // Check if view was already tracked in this session
    const viewKey = `${post.id}-${user.id}`;
    const sessionViews = sessionStorage.getItem('viewedPosts');
    let viewedSet: Set<string> = new Set();
    
    if (sessionViews) {
      try {
        viewedSet = new Set(JSON.parse(sessionViews));
      } catch (e) {}
    }
    
    if (viewedSet.has(viewKey)) {
      setHasTrackedView(true);
      return;
    }

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView) {
          setHasTrackedView(true);
          
          // Track the view in the database only if not already tracked
          if (!viewedSet.has(viewKey)) {
            try {
              const { error } = await supabase
                .from('post_views')
                .insert({
                  post_id: post.id,
                  viewer_id: user.id,
                });
              
              if (!error) {
                // Mark as viewed in session storage
                viewedSet.add(viewKey);
                sessionStorage.setItem('viewedPosts', JSON.stringify(Array.from(viewedSet)));
              }
            } catch (error: any) {
              // Only log non-duplicate errors
              if (!error?.message?.includes('duplicate')) {
                console.debug('View tracking error:', error);
              }
            }
          }
        }
      },
      { threshold: 0.5, rootMargin: '50px' } // Preload views slightly before visible
    );

    observer.observe(postRef.current);

    return () => observer.disconnect();
  }, [user, post.id, hasTrackedView]);
  
  // Organize replies into a tree structure
  const organizeReplies = (replies: Reply[]): Reply[] => {
    const replyMap = new Map<string, Reply>();
    const topLevelReplies: Reply[] = [];

    // First pass: create reply objects with nested_replies arrays
    replies.forEach(reply => {
      replyMap.set(reply.id, { ...reply, nested_replies: [] });
    });

    // Second pass: organize into tree structure
    replies.forEach(reply => {
      const replyWithNested = replyMap.get(reply.id)!;
      if (reply.parent_reply_id && replyMap.has(reply.parent_reply_id)) {
        const parent = replyMap.get(reply.parent_reply_id)!;
        parent.nested_replies!.push(replyWithNested);
      } else {
        topLevelReplies.push(replyWithNested);
      }
    });

    // Sort: pinned replies first, then by creation date
    const sortReplies = (repliesToSort: Reply[]): Reply[] => {
      return repliesToSort.sort((a, b) => {
        // Pinned replies come first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // Otherwise sort by date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    };

    return sortReplies(topLevelReplies);
  };

  const organizedReplies = organizeReplies(post.replies || []);
  
  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleTranslate = async () => {
    if (translatedContent) {
      setTranslatedContent(null);
      return;
    }

    setIsTranslating(true);
    const translated = await translateText(post.content, i18n.language);
    setTranslatedContent(translated);
    setIsTranslating(false);
  };

  const handleAiTransfer = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const postDetails = {
      postId: post.id,
      postContent: post.content,
      postAuthorHandle: post.profiles.handle,
    };

    navigate('/ai-chat', { 
        state: { 
            context: 'post_analysis',
            postDetails: postDetails 
        } 
    });
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: `Check out this post by ${post.profiles.display_name}`,
      text: post.content.substring(0, 100) + '...',
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      navigator.share(shareData).catch((error) => {
        console.error('Error sharing', error);
        // Fallback to copy
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast.success(t('feed.linkCopied'));
        }).catch(() => {
          toast.error(t('feed.failedToCopy'));
        });
      });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success(t('feed.linkCopied'));
      }).catch(() => {
        toast.error(t('feed.failedToCopy'));
      });
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !user || guestMode) {
      toast.info('Please sign in to comment on posts', {
        action: {
          label: 'Sign In',
          onClick: () => navigate('/auth/signin')
        }
      });
      return;
    }

    const trimmedReplyText = replyText.trim();
    const mention = post.profiles.handle ? `@${post.profiles.handle}` : '';
    const finalContent = mention ? `${trimmedReplyText} ${mention}` : trimmedReplyText;
    const tempId = `temp-reply-${Date.now()}`;
    
    // Create optimistic reply
    const optimisticReply: Reply = {
      id: tempId,
      post_id: post.id,
      author_id: user.id,
      content: finalContent,
      created_at: new Date().toISOString(),
      parent_reply_id: null,
      nested_replies: [],
      profiles: {
        display_name: user?.user_metadata?.display_name || 'User',
        handle: user?.user_metadata?.handle || 'user',
        is_verified: user?.user_metadata?.is_verified || false,
        is_organization_verified: user?.user_metadata?.is_organization_verified || false,
        is_affiliate: false,
        avatar_url: userProfile?.avatar_url || null,
        is_business_mode: false,
      },
    };
    
    // Add optimistic reply immediately
    addReply(post.id, optimisticReply);
    setReplyText('');
    setShowComments(true);

    try {
      const { data: newReply, error } = await supabase
        .from('post_replies')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: finalContent,
          parent_reply_id: null,
        })
        .select('*, profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, verification_source)')
        .single();

      if (error) throw error;

      if (newReply) {
        // Fetch affiliated business data if needed
        let affiliated_business = null;
        if (newReply.profiles?.affiliated_business_id) {
          const { data: businessData } = await supabase
            .from('profiles')
            .select('avatar_url, display_name')
            .eq('id', newReply.profiles.affiliated_business_id)
            .single();
          affiliated_business = businessData || null;
        }

        // Real-time subscription will handle adding the actual reply
        // Just show success message
        toast.success('Reply posted!');
        awardNexa('create_reply', { post_id: post.id });
        
        // Award XP to post author
        fetch('https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/award-xp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            userId: post.author_id,
            actionType: 'receive_reply',
            xpAmount: 3,
            metadata: { post_id: post.id, from_user_id: user.id }
          }),
        });
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Failed to post reply. Please try again.');
      
      // Rollback: Remove the optimistic reply
      window.dispatchEvent(new CustomEvent('remove-optimistic-reply', { 
        detail: { postId: post.id, replyId: tempId } 
      }));
      
      // Restore the reply text so user can try again
      setReplyText(trimmedReplyText);
    }
  };

  const handleReplyToReply = async (parentReplyId: string, content: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const tempId = `temp-nested-reply-${Date.now()}`;
    
    // Create optimistic nested reply
    const optimisticReply: Reply = {
      id: tempId,
      post_id: post.id,
      author_id: user.id,
      content: content,
      created_at: new Date().toISOString(),
      parent_reply_id: parentReplyId,
      nested_replies: [],
      profiles: {
        display_name: user?.user_metadata?.display_name || 'User',
        handle: user?.user_metadata?.handle || 'user',
        is_verified: user?.user_metadata?.is_verified || false,
        is_organization_verified: user?.user_metadata?.is_organization_verified || false,
        is_affiliate: false,
        avatar_url: userProfile?.avatar_url || null,
        is_business_mode: false,
      },
    };

    // Add optimistic reply immediately
    addReply(post.id, optimisticReply);

    try {
      const { data: newReply, error } = await supabase
        .from('post_replies')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: content,
          parent_reply_id: parentReplyId,
        })
        .select('*, profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, verification_source)')
        .single();

      if (error) throw error;

      // Real-time subscription will handle adding the actual reply
      toast.success('Reply posted!');
      awardNexa('create_reply', { post_id: post.id });
    } catch (error) {
      console.error('Nested reply error:', error);
      toast.error('Failed to post reply. Please try again.');
      
      // Rollback: Remove the optimistic reply
      window.dispatchEvent(new CustomEvent('remove-optimistic-reply', { 
        detail: { postId: post.id, replyId: tempId } 
      }));
    }
  };

  const handlePinReply = async (replyId: string, currentPinnedState: boolean) => {
    if (!user || user.id !== post.author_id) {
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
      console.error(error);
      return;
    }

    toast.success(currentPinnedState ? 'Comment unpinned' : 'Comment pinned');
    
    // Update local state
    const updatedReplies = post.replies.map(r => 
      r.id === replyId 
        ? { ...r, is_pinned: !currentPinnedState, pinned_by: !currentPinnedState ? user.id : null, pinned_at: !currentPinnedState ? new Date().toISOString() : null }
        : r
    );
    
    // Update the post in the parent's state would typically happen via realtime
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!user) {
      toast.error('Please sign in to delete');
      return;
    }

    const { error } = await supabase
      .from('post_replies')
      .delete()
      .eq('id', replyId);

    if (error) {
      toast.error('Failed to delete comment');
      console.error(error);
      return;
    }

    toast.success('Comment deleted');
    
    // Update local state by removing the reply
    const updatedReplies = post.replies.filter(r => r.id !== replyId);
    // Trigger parent refresh would happen via realtime
  };

  return (
    <div ref={postRef} className="flex py-2 pl-0 pr-4 transition-colors hover:bg-muted/5">
      <div
        className="mr-2 sm:mr-3 flex-shrink-0 cursor-pointer ml-0.5 sm:ml-1"
        onClick={() => handleViewProfile(post.author_id)}
      >
        <UserAvatarMedium 
          userId={post.author_id} 
          name={post.profiles.display_name}
          avatarUrl={post.profiles.avatar_url}
          lastSeen={post.profiles.last_seen}
          showOnlineStatus={post.profiles.show_online_status}
          isBusiness={post.profiles.is_business_mode}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-1 min-w-0">
            <span
              className="font-bold text-foreground text-sm sm:text-base cursor-pointer hover:underline truncate max-w-[100px] sm:max-w-[140px]"
              onClick={() => handleViewProfile(post.author_id)}
              title={post.profiles.display_name}
            >
              {post.profiles.display_name.length > 12 ? `${post.profiles.display_name.slice(0, 10)}...` : post.profiles.display_name}
            </span>
            
            {post.profiles.is_affiliate && post.profiles.is_business_mode && (
              <AffiliatedBadge size="sm" />
            )}
            
            {post.profiles.is_warned && (
              <WarningBadge size="sm" reason={post.profiles.warning_reason} variant="post" />
            )}
            
            <VerifiedBadge 
              isVerified={post.profiles.is_verified || post.is_developer}
              isOrgVerified={post.profiles.is_organization_verified}
              isAffiliate={post.profiles.is_affiliate}
              isDeveloper={post.is_developer}
              affiliateBusinessLogo={post.profiles.affiliated_business?.avatar_url}
              affiliateBusinessName={post.profiles.affiliated_business?.display_name}
              size="sm"
              userId={post.author_id}
              verificationSource={post.profiles.verification_source}
            />
            {post.profiles.is_business_mode && !post.profiles.is_affiliate && (
              <BusinessBadge size="sm" />
            )}

            <span
              className="text-muted-foreground text-[10px] sm:text-xs hover:underline cursor-pointer truncate flex-shrink min-w-0"
              onClick={() => handleViewProfile(post.author_id)}
            >
              @{post.profiles.handle}
            </span>

            <span className="text-muted-foreground text-[10px] sm:text-xs flex-shrink-0">·</span>
            <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0">
              {formatTime(post.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button 
                className="p-1 opacity-60 hover:opacity-100 transition-opacity" 
                title={t('feed.analyzePost')}
                onClick={handleAiTransfer}
            >
                <img src={aiSparkIcon} alt="AI" className="h-6 w-6 select-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
            </button>
            
            <PostActionsSheet
                post={post}
                user={user}
                navigate={navigate}
                onDelete={onDeletePost}
                onReport={onReportPost}
                onEdit={onEditPost}
                onQuote={onQuotePost}
                onHidePost={onHidePost}
            />
          </div>
        </div>

        <div 
          className="block cursor-pointer"
          onClick={() => navigate(`/post/${post.id}`)}
        >
          <ReadMoreText
            text={parsePostContent(translatedContent || post.content, post.id, navigate)}
            maxLines={4}
            minCharsToShow={0}
            className="text-foreground whitespace-pre-wrap"
          />
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
              className="mt-2"
            />
          )}
          {/* Quoted Post */}
          {post.quoted_post && (
            <QuotedPostCard quotedPost={post.quoted_post} />
          )}
          {post.post_link_previews && post.post_link_previews.length > 0 && (
            <div className="mt-2 space-y-2">
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
              onClick={(e) => {
                e.stopPropagation();
                handleTranslate();
              }}
              disabled={isTranslating}
              className="text-xs text-muted-foreground hover:text-primary mt-1 p-0 h-auto"
            >
              {isTranslating ? t('common.translating') : translatedContent ? t('common.showOriginal') : t('common.translate')}
            </Button>
          )}
        </div>
        
        {/* AI Post Summary for longer posts */}
        {post.content.length >= 150 && (
          <AIPostSummary postContent={post.content} postId={post.id} />
        )}


        <div className="flex justify-between items-center text-xs text-muted-foreground mt-1 -ml-1.5 sm:-ml-2 max-w-full sm:max-w-[450px]">
          <Button variant="ghost" size="sm" className="flex items-center gap-0.5 sm:gap-1 group h-7 sm:h-8 px-2 sm:px-3" onClick={() => {
            if (!showComments && post.profiles.handle) {
              setReplyText(`@${post.profiles.handle} `);
            }
            setShowComments(!showComments);
          }}>
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:text-primary transition-colors" />
            <span className="group-hover:text-primary transition-colors text-[10px] sm:text-xs">{post.reply_count > 0 ? post.reply_count : ''}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-0.5 sm:gap-1 group h-7 sm:h-8 px-2 sm:px-3" onClick={() => onAcknowledge(post.id, post.has_liked)}>
            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:text-red-500 transition-colors ${post.has_liked ? 'text-red-500 fill-red-500' : ''}`} />
            <span className={`group-hover:text-red-500 transition-colors text-[10px] sm:text-xs ${post.has_liked ? 'text-red-500' : ''}`}>{post.like_count > 0 ? post.like_count : ''}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-0.5 sm:gap-1 group h-7 sm:h-8 px-2 sm:px-3"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowViewsSheet(true);
            }}
          >
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[10px] sm:text-xs group-hover:text-primary transition-colors">{post.view_count > 0 ? post.view_count : ''}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-0.5 sm:gap-1 group h-7 sm:h-8 px-2 sm:px-3" onClick={handleShare}>
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:text-primary transition-colors" />
          </Button>
          {user && user.id !== post.author_id && (
            <>
              <SendGiftDialog
                receiverId={post.author_id}
                receiverName={post.profiles.display_name}
                trigger={
                  <Button variant="ghost" size="sm" className="flex items-center gap-0.5 sm:gap-1 group h-7 sm:h-8 px-2 sm:px-3">
                    <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:text-pink-500 transition-colors" />
                  </Button>
                }
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-0.5 sm:gap-1 group h-7 sm:h-8 px-2 sm:px-3"
                onClick={async () => {
                  // Create or find existing chat with post author
                  const { data: existingChat } = await supabase
                    .from('chats')
                    .select('id')
                    .or(`and(user_id.eq.${user.id},created_by.eq.${post.author_id}),and(user_id.eq.${post.author_id},created_by.eq.${user.id})`)
                    .eq('is_group', false)
                    .maybeSingle();
                  
                  if (existingChat) {
                    navigate(`/chat/${existingChat.id}`);
                  } else {
                    // Create new chat
                    const { data: newChat, error } = await supabase
                      .from('chats')
                      .insert({
                        user_id: post.author_id,
                        created_by: user.id,
                        is_group: false
                      })
                      .select('id')
                      .single();
                    
                    if (error) {
                      toast.error('Failed to start chat');
                      return;
                    }
                    
                    // Add both users as members
                    await supabase.from('chat_members').insert([
                      { chat_id: newChat.id, user_id: user.id },
                      { chat_id: newChat.id, user_id: post.author_id }
                    ]);
                    
                    navigate(`/chat/${newChat.id}`);
                  }
                }}
              >
                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:text-primary transition-colors" />
              </Button>
            </>
          )}
        </div>

        <div className="mt-1 ml-[-8px] sm:ml-[-12px] pr-[8px] sm:pr-[12px]">
          {post.reply_count > 0 && !showComments && (
            <span
              className="text-sm sm:text-base font-semibold text-muted-foreground cursor-pointer hover:underline hover:text-primary transition-colors"
              onClick={() => setShowComments(true)}
            >
              {t('feed.viewComments', { count: post.reply_count })}
            </span>
          )}

          {showComments && post.replies && post.replies.length > 0 && (
            <div className="space-y-1 pt-2 pl-3 sm:pl-4 ml-2 sm:ml-3">
              {organizedReplies.slice(0, visibleRepliesCount).map((reply) => (
                <FeedNestedReplyItem
                  key={reply.id} 
                  reply={reply}
                  depth={0}
                  handleViewProfile={handleViewProfile}
                  onReplyToReply={handleReplyToReply}
                  onPinReply={handlePinReply}
                  onDeleteReply={handleDeleteReply}
                  isPostAuthor={user?.id === post.author_id}
                  currentUserId={user?.id}
                  parsePostContent={(content, postId) => parsePostContent(content, postId, navigate)}
                  formatTime={formatTime}
                  UserAvatarSmall={UserAvatarSmall}
                  VerifiedBadge={VerifiedBadge}
                />
              ))}
              {organizedReplies.length > visibleRepliesCount && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleRepliesCount(prev => prev + 10)}
                  className="text-primary text-xs mt-2 hover:underline"
                >
                  {t('feed.loadMoreComments', { count: organizedReplies.length - visibleRepliesCount })}
                </Button>
              )}
            </div>
          )}

          {showComments && user && (
            <div className="mt-2">
              <CommentInput
                postId={post.id}
                postAuthorHandle={post.profiles.handle}
                onCommentSubmitted={() => {
                  awardNexa('create_reply', { post_id: post.id });
                }}
                compact
              />
            </div>
          )}
          {showComments && !user && (
            <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground">
              {t('feed.signInToReply')}
            </div>
          )}
        </div>
      </div>

      <ViewsAnalyticsSheet
        postId={post.id}
        isOpen={showViewsSheet}
        onClose={() => setShowViewsSheet(false)}
        totalViews={post.view_count}
        isPostOwner={user?.id === post.author_id}
      />
    </div>
  );
};


// --- FEED COMPONENT (Updated with new handlers) ---

interface FeedProps {
  defaultTab?: 'foryou' | 'following';
  guestMode?: boolean;
}

const Feed = ({ defaultTab = 'foryou', guestMode = false }: FeedProps = {}) => {
  const { t } = useTranslation();
  const { awardNexa } = useNexa();
  const { user } = useAuth();
  const navigate = useNavigate();
  const feedRef = useRef<HTMLDivElement>(null);
  
  // Premium status - must be at top level with other hooks
  const { isPremium, loading: premiumLoading, expiresAt } = usePremiumStatus();
  
  // Personalized feed algorithm
  const { sortPosts, recordInteraction, learnUserInterests } = useFeedAlgorithm();
  
  // All useState hooks first
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>(defaultTab);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [quotePost, setQuotePost] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleQuotePost = (post: Post) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setQuotePost(post);
  };
  
  
  // Scroll hide state for header
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Track which posts have had view attempts to prevent duplicates
  const viewedPostsRef = useRef<Set<string>>(new Set());
  // Load previously viewed posts from session storage
  useEffect(() => {
    const savedViews = sessionStorage.getItem('viewedPosts');
    if (savedViews) {
      try {
        const viewedArray = JSON.parse(savedViews);
        viewedPostsRef.current = new Set(viewedArray);
      } catch (e) {
        console.error('Failed to parse viewed posts:', e);
      }
    }
  }, []);

  // Sync activeTab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Scroll hide effect for header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsScrollingDown(true);
      } else {
        setIsScrollingDown(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Load fresh data on mount - clear caches to ensure new posts show
  useEffect(() => {
    // Clear all feed caches on page load to ensure fresh posts
    sessionStorage.removeItem('feedPosts');
    sessionStorage.removeItem('feedFollowingPosts');
    sessionStorage.removeItem('feedShuffleSeed');
    
    // Clear algorithm sort seed to get fresh ordering
    if (user) {
      sessionStorage.removeItem(`feedSortSeed:${user.id}`);
    } else {
      sessionStorage.removeItem('feedSortSeed:guest');
    }
    
    // Restore active tab preference
    const cachedTab = sessionStorage.getItem('feedActiveTab');
    if (cachedTab) {
      setActiveTab(cachedTab as 'foryou' | 'following');
    }
    
    // Clean up old viewed posts data (keep only last 500 views)
    const viewedPosts = sessionStorage.getItem('viewedPosts');
    if (viewedPosts) {
      try {
        const viewed = JSON.parse(viewedPosts);
        if (viewed.length > 500) {
          sessionStorage.setItem('viewedPosts', JSON.stringify(viewed.slice(-500)));
        }
      } catch (e) {
        sessionStorage.removeItem('viewedPosts');
      }
    }
    
    // Fetch fresh data
    setCurrentPage(0);
    setHasMore(true);
    fetchPosts(0, true);
  }, [user]);

  // Refetch posts when user changes to get correct has_liked status
  useEffect(() => {
    if (user) {
      // Fetch user profile
      supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUserProfile(data);
          }
        });
    }
  }, [user]);

  // Save active tab preference
  useEffect(() => {
    sessionStorage.setItem('feedActiveTab', activeTab);
  }, [activeTab]);

  // Restore scroll position after content is rendered - use window scroll
  useEffect(() => {
    if (posts.length > 0) {
      const savedPosition = sessionStorage.getItem('feedScrollPosition');
      if (savedPosition) {
        // Small delay to ensure content is rendered
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition));
        }, 50);
      }
    }
  }, [posts.length]);

  const addReply = useCallback((postId: string, newReply: Reply) => {
    const updateWithReply = (cur: Post[]) =>
      cur.map((p) =>
        p.id === postId
          ? {
            ...p,
            replies: [...(p.replies || []), newReply].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
            reply_count: (p.reply_count || 0) + 1,
          }
          : p
      );
    
    setPosts(updateWithReply);
    setFollowingPosts(updateWithReply);
  }, []);

  // Listen for optimistic post and reply events
  useEffect(() => {
    const handleOptimisticPostAdd = (event: CustomEvent) => {
      const optimisticPost = event.detail;
      setPosts(prev => [optimisticPost, ...prev]);
      setFollowingPosts(prev => [optimisticPost, ...prev]);
    };

    const handleOptimisticPostSuccess = (event: CustomEvent) => {
      const { tempId } = event.detail;
      // Remove optimistic post - real-time subscription will add the real one
      setPosts(prev => prev.filter(p => p.id !== tempId));
      setFollowingPosts(prev => prev.filter(p => p.id !== tempId));
    };

    const handleOptimisticPostError = (event: CustomEvent) => {
      const tempId = event.detail;
      // Remove failed optimistic post
      setPosts(prev => prev.filter(p => p.id !== tempId));
      setFollowingPosts(prev => prev.filter(p => p.id !== tempId));
    };

    // Handle new post created by current user - add immediately to top
    const handleOwnPostCreated = async (event: CustomEvent) => {
      const postData = event.detail;
      
      // Fetch the complete post data
      const { data: newPost, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, verification_source),
          post_images(image_url, display_order, alt_text),
          post_link_previews(url, title, description, image_url, site_name)
        `)
        .eq('id', postData.id)
        .single();

      if (!error && newPost) {
        // Fetch quoted post if exists
        let quotedPost = null;
        if (newPost.quoted_post_id) {
          const { data: quotedData } = await supabase
            .from('posts')
            .select(`
              id, content, created_at, author_id, image_url,
              profiles(display_name, handle, is_verified, is_organization_verified, avatar_url),
              post_images(image_url, display_order, alt_text)
            `)
            .eq('id', newPost.quoted_post_id)
            .single();
          quotedPost = quotedData;
        }

        const mappedPost: Post = {
          ...newPost,
          profiles: newPost.profiles ? {
            ...newPost.profiles,
            verification_source: newPost.profiles.verification_source as 'manual' | 'premium' | null
          } : { display_name: 'Unknown', handle: 'unknown', is_verified: false, is_organization_verified: false, is_affiliate: false, verification_source: null },
          replies: [],
          reply_count: 0,
          like_count: 0,
          view_count: newPost.view_count || 0,
          has_liked: false,
          quoted_post: quotedPost,
        };
        
        // Add to top of feed immediately
        setPosts(prev => [mappedPost, ...prev.filter(p => p.id !== postData.id)]);
        setFollowingPosts(prev => [mappedPost, ...prev.filter(p => p.id !== postData.id)]);
      }
    };

    const handleRemoveOptimisticReply = (event: CustomEvent) => {
      const { postId, replyId } = event.detail;
      const removeReply = (currentPosts: Post[]) =>
        currentPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                replies: p.replies.filter((r) => r.id !== replyId),
                reply_count: Math.max(0, p.reply_count - 1),
              }
            : p
        );
      
      setPosts(removeReply);
      setFollowingPosts(removeReply);
    };

    window.addEventListener('optimistic-post-add', handleOptimisticPostAdd as EventListener);
    window.addEventListener('optimistic-post-success', handleOptimisticPostSuccess as EventListener);
    window.addEventListener('optimistic-post-error', handleOptimisticPostError as EventListener);
    window.addEventListener('remove-optimistic-reply', handleRemoveOptimisticReply as EventListener);
    window.addEventListener('own-post-created', handleOwnPostCreated as EventListener);

    return () => {
      window.removeEventListener('optimistic-post-add', handleOptimisticPostAdd as EventListener);
      window.removeEventListener('optimistic-post-success', handleOptimisticPostSuccess as EventListener);
      window.removeEventListener('optimistic-post-error', handleOptimisticPostError as EventListener);
      window.removeEventListener('remove-optimistic-reply', handleRemoveOptimisticReply as EventListener);
      window.removeEventListener('own-post-created', handleOwnPostCreated as EventListener);
    };
  }, []);

  const handleAcknowledge = useCallback(async (postId: string, currentHasLiked: boolean) => {
    if (!user || guestMode) {
      toast.info('Please sign in to like posts', {
        action: {
          label: 'Sign In',
          onClick: () => navigate('/auth/signin')
        }
      });
      return;
    }
    const currentUserId = user.id;

    // Update both posts and followingPosts optimistically
    const updatePosts = (currentPosts: Post[]) =>
      currentPosts.map((p) =>
        p.id === postId
          ? { ...p, has_liked: !currentHasLiked, like_count: p.like_count + (!currentHasLiked ? 1 : -1) }
          : p
      );
    
    setPosts(updatePosts);
    setFollowingPosts(updatePosts);

    if (currentHasLiked) {
      const { error } = await supabase
        .from('post_acknowledgments')
        .delete()
        .match({ post_id: postId, user_id: currentUserId });

      if (error) {
        console.error('Unlike error:', error);
        toast.error('Failed to unlike post');
        // Revert both
        const revertPosts = (currentPosts: Post[]) =>
          currentPosts.map((p) =>
            p.id === postId
              ? { ...p, has_liked: currentHasLiked, like_count: p.like_count + 1 }
              : p
          );
        setPosts(revertPosts);
        setFollowingPosts(revertPosts);
      }
    } else {
      // Use upsert with onConflict to handle duplicate likes gracefully
      const { error } = await supabase
        .from('post_acknowledgments')
        .upsert(
          { post_id: postId, user_id: currentUserId },
          { onConflict: 'post_id,user_id', ignoreDuplicates: true }
        );

      if (error) {
        console.error('Like error:', error);
        toast.error('Failed to like post');
        // Revert both
        const revertPosts = (currentPosts: Post[]) =>
          currentPosts.map((p) =>
            p.id === postId
              ? { ...p, has_liked: currentHasLiked, like_count: p.like_count - 1 }
              : p
          );
        setPosts(revertPosts);
        setFollowingPosts(revertPosts);
      } else {
        // Award Nexa for giving a reaction
        awardNexa('give_reaction', { post_id: postId });
        
        // Record interaction for personalized feed algorithm
        const post = posts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
        if (post) {
          recordInteraction('like', post.content, post.author_id);
        }
        
        // Award Nexa to post author for receiving a reaction
        if (post && post.author_id !== currentUserId) {
          fetch('https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/award-xp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              userId: post.author_id,
              actionType: 'receive_reaction',
              xpAmount: 2,
              metadata: { post_id: postId, from_user_id: currentUserId }
            }),
          });
        }
      }
    }
  }, [user, guestMode, navigate, posts, followingPosts, awardNexa, recordInteraction]);

  // NEW: Delete Post Handler - Opens confirmation sheet
  const handleDeletePost = useCallback((postId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setDeletePostId(postId);
  }, [user, navigate]);

  // Actual delete after confirmation
  const confirmDeletePost = useCallback(async () => {
    if (!deletePostId || !user) return;
    
    setIsDeleting(true);
    const postToDelete = posts.find(p => p.id === deletePostId);
    if (user.id !== postToDelete?.author_id) {
        toast.error('You can only delete your own posts.');
        setIsDeleting(false);
        setDeletePostId(null);
        return;
    }

    setPosts(currentPosts => currentPosts.filter(p => p.id !== deletePostId));

    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', deletePostId)
        .eq('author_id', user.id);

    if (error) {
        toast.error('Failed to delete post.');
        console.error('Delete error:', error);
        fetchPosts();
    } else {
        toast.success('Post successfully deleted!');
    }
    
    setIsDeleting(false);
    setDeletePostId(null);
  }, [deletePostId, user, posts]);

  // NEW: Report Post Handler - Opens report sheet
  const handleReportPost = useCallback((postId: string) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setReportPostId(postId);
  }, [user, navigate]);

  // Actual report after reason selection
  const confirmReportPost = useCallback((reason: string) => {
      if (!reportPostId || !user) return;
      
      console.log(`User ${user.id} reported post ${reportPostId} for: ${reason}`);
      toast.success('Post reported. We will review this content.');
      setReportPostId(null);

      // In a real app, you would insert a record into a 'post_reports' table here.
  }, [user]);

  // Hide Post Handler - Removes post from local view
  const handleHidePost = useCallback((postId: string) => {
    setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    setFollowingPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
  }, []);

  // Edit Post Handler - Opens edit modal
  const handleEditPost = useCallback((postId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const post = posts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
    if (post) {
      setEditPost(post);
    }
  }, [user, navigate, posts, followingPosts]);

  // After post is updated, refresh the posts
  const handlePostUpdated = useCallback(() => {
    fetchPosts();
    setEditPost(null);
  }, []);



  const fetchPosts = useCallback(async (page: number = 0, isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    
    // Set a timeout to prevent endless loading
    const loadingTimeout = setTimeout(() => {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
      toast.error('Loading is taking longer than expected. Please check your connection.');
    }, 30000);
    
    try {
      const POSTS_PER_PAGE = 25; // Posts to display per page
      // For pagination, calculate proper offset based on displayed posts count
      const from = page * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // Fetch posts with optimized query - only essential fields, exclude blocked posts
      const { data: postData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          author_id,
          view_count,
          image_url,
          quoted_post_id,
          is_blocked,
          profiles!inner(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, is_warned, warning_reason, verification_source),
          post_images(image_url, display_order, alt_text),
          post_link_previews(url, title, description, image_url, site_name)
        `)
        .eq('is_blocked', false)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (postsError) throw postsError;
      if (!postData) throw new Error('No posts data received');

      // Check if there are more posts to load
      setHasMore(postData.length === POSTS_PER_PAGE);

      // Fetch following posts efficiently - only if user is logged in
      let followingPostData: any[] = [];
      if (user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .limit(100); // Limit to reduce data

        if (followingData?.length > 0) {
          const followingIds = followingData.map((f) => f.following_id);
          const { data } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              updated_at,
              author_id,
              view_count,
              image_url,
              quoted_post_id,
              is_blocked,
              profiles!inner(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, is_warned, warning_reason, verification_source),
              post_images(image_url, display_order, alt_text),
              post_link_previews(url, title, description, image_url, site_name)
            `)
            .in('author_id', followingIds)
            .eq('is_blocked', false)
            .order('created_at', { ascending: false })
            .limit(50); // Limit following posts
          followingPostData = data || [];
        }
      }

      const postIds = postData.map((p) => p.id);

      // Batch fetch all data in parallel
      const [businessData, affiliationData, repliesData, likedData, likeCountsData, quotedPostsData, developerData] = await Promise.all([
        // Business profiles
        (async () => {
          const businessIds = Array.from(new Set([
            ...postData.map(p => p.profiles?.affiliated_business_id),
            ...followingPostData.map(p => p.profiles?.affiliated_business_id)
          ].filter(Boolean))) as string[];

          if (businessIds.length === 0) return new Map();

          const { data } = await supabase
            .from('profiles')
            .select('id, avatar_url, display_name')
            .in('id', businessIds);

          const map = new Map();
          (data || []).forEach((b: any) => map.set(b.id, { avatar_url: b.avatar_url, display_name: b.display_name }));
          return map;
        })(),

        // Affiliation dates
        (async () => {
          const authorIds = Array.from(new Set([
            ...postData.filter(p => p.profiles?.is_affiliate).map(p => p.author_id),
            ...followingPostData.filter(p => p.profiles?.is_affiliate).map(p => p.author_id)
          ])) as string[];

          if (authorIds.length === 0) return new Map();

          const { data } = await supabase
            .from('affiliate_requests')
            .select('user_id, reviewed_at')
            .in('user_id', authorIds)
            .eq('status', 'approved');

          const map = new Map();
          (data || []).forEach((a: any) => map.set(a.user_id, a.reviewed_at));
          return map;
        })(),

        // Replies (needed for preview + reply list)
        supabase
          .from('post_replies')
          .select('*, profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, is_warned, warning_reason, verification_source)')
          .in('post_id', postIds)
          .order('created_at', { ascending: true }),

        // Current user's likes only (for has_liked)
        user
          ? supabase
              .from('post_acknowledgments')
              .select('post_id')
              .in('post_id', postIds)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] as any[] }),

        // Aggregate like counts (prevents PostgREST row-limit truncation)
        supabase.rpc('get_post_like_counts', { post_ids: postIds }),

        // Quoted posts
        (async () => {
          const quotedPostIds = Array.from(new Set([
            ...postData.map(p => p.quoted_post_id),
            ...followingPostData.map(p => p.quoted_post_id)
          ].filter(Boolean))) as string[];

          if (quotedPostIds.length === 0) return new Map();

          const { data } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              author_id,
              image_url,
              post_images(image_url, display_order, alt_text),
              profiles(display_name, handle, is_verified, is_organization_verified, avatar_url)
            `)
            .in('id', quotedPostIds);

          const map = new Map();
          (data || []).forEach((qp: any) => {
            // Ensure profiles fallback for quoted posts
            if (!qp.profiles) {
              qp.profiles = { display_name: 'Unknown', handle: 'unknown', is_verified: false, is_organization_verified: false, avatar_url: null };
            }
            map.set(qp.id, qp);
          });
          return map;
        })(),

        // Developer roles
        (async () => {
          const authorIds = Array.from(new Set([
            ...postData.map(p => p.author_id),
            ...followingPostData.map(p => p.author_id)
          ])) as string[];

          if (authorIds.length === 0) return new Set<string>();

          const { data } = await supabase
            .from('developer_roles')
            .select('user_id')
            .in('user_id', authorIds);

          return new Set((data || []).map((d: any) => d.user_id));
        })()
      ]);

      // Process replies
      const repliesByPostId = new Map<string, Reply[]>();
      (repliesData.data || []).forEach((r: any) => {
        const reply = r as Reply;
        if (reply.profiles?.affiliated_business_id) {
          reply.profiles.affiliated_business = businessData.get(reply.profiles.affiliated_business_id) || null;
        }
        if (reply.profiles?.is_affiliate && reply.author_id) {
          reply.affiliation_date = affiliationData.get(reply.author_id);
        }
        // Add developer status to reply
        reply.is_developer = developerData.has(reply.author_id);
        if (!repliesByPostId.has(r.post_id)) repliesByPostId.set(r.post_id, []);
        repliesByPostId.get(r.post_id)!.push(reply);
      });

      // Like counts map
      const likeCountByPostId = new Map<string, number>();
      (likeCountsData.data || []).forEach((row: any) => likeCountByPostId.set(row.post_id, Number(row.like_count || 0)));

      // Current user liked set
      const likedSet = new Set<string>((likedData as any)?.data?.map((r: any) => r.post_id) || []);

      // Map posts
      const mapPost = (post: any) => {
        const replies = repliesByPostId.get(post.id) || [];

        if (post.profiles?.affiliated_business_id) {
          post.profiles.affiliated_business = businessData.get(post.profiles.affiliated_business_id) || null;
        }

        // Get quoted post data if exists and add developer status
        const quotedPost = post.quoted_post_id ? quotedPostsData.get(post.quoted_post_id) : null;
        if (quotedPost && quotedPost.author_id) {
          quotedPost.is_developer = developerData.has(quotedPost.author_id);
        }

        return {
          ...post,
          profiles: post.profiles || { display_name: 'Unknown', handle: 'unknown', is_verified: false, is_organization_verified: false, is_affiliate: false, is_business_mode: false, avatar_url: null, affiliated_business_id: null, affiliated_business: null, last_seen: null, show_online_status: false, is_warned: false, warning_reason: null, verification_source: null },
          quoted_post: quotedPost,
          replies,
          reply_count: replies.length,
          like_count: likeCountByPostId.get(post.id) ?? 0,
          view_count: post.view_count || 0,
          has_liked: user ? likedSet.has(post.id) : false,
          affiliation_date: post.profiles?.is_affiliate && post.author_id ? affiliationData.get(post.author_id) : undefined,
          is_developer: developerData.has(post.author_id),
        } as Post;
      };

      // Apply personalized feed algorithm for "For You" tab
      // Following tab stays chronological for fresh content from followed users
      const mappedPosts = postData.map(mapPost);
      const mappedFollowingPosts = followingPostData.map(mapPost);
      
      // Sort posts with personalization when logged in, random shuffle for guests
      const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      const finalPosts = user ? sortPosts(mappedPosts) : shuffleArray(mappedPosts);
      
      // Following posts stay chronological (already sorted by created_at desc)
      const finalFollowingPosts = mappedFollowingPosts;
      
      if (isInitial) {
        setPosts(finalPosts);
        setFollowingPosts(finalFollowingPosts);
      } else {
        // For pagination, append only NEW posts (deduplicate by id)
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newUniquePosts = finalPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newUniquePosts];
        });
        setFollowingPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newUniquePosts = finalFollowingPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newUniquePosts];
        });
      }
    } catch (err) {
      console.error('[Feed] Error fetching posts:', err);
      toast.error('Could not fetch feed. Please try again.');
      if (isInitial) {
        setPosts([]);
        setFollowingPosts([]);
      }
      setHasMore(false);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
      setLoadingMore(false);
    }
   }, [user, sortPosts]);

  // Manually load next page of posts (used by scroll + button)
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchPosts(currentPage + 1, false);
    setCurrentPage(prev => prev + 1);
  }, [loadingMore, hasMore, loading, currentPage, fetchPosts]);

  // Save scroll position and detect bottom for pagination - use window scroll
  useEffect(() => {
    const handleWindowScroll = () => {
      // Save scroll position
      sessionStorage.setItem('feedScrollPosition', window.scrollY.toString());
      
      // Check if near bottom for pagination - trigger earlier for smoother experience
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 800; // Trigger 800px before bottom
      
      if (isNearBottom && !loadingMore && hasMore && !loading) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [handleLoadMore, loadingMore, hasMore, loading]);


  useEffect(() => {
    const postsChannel = supabase
      .channel('feed-updates')
      // Real-time auto-append for new posts when online
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          // Skip if this is current user's post (will be added via custom event)
          if (payload.new.author_id === user?.id) return;
          
          // For other users' posts, just increment the new posts count
          setNewPostsCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        async (payload) => {
          // Fetch updated post data
          const { data: updatedPost, error } = await supabase
            .from('posts')
            .select(`
              *,
              profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, verification_source),
              post_images(image_url, display_order, alt_text),
              post_link_previews(url, title, description, image_url, site_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && updatedPost) {
            // Update post in both feeds while preserving replies and likes
            const updatePost = (currentPosts: Post[]): Post[] =>
              currentPosts.map((p) =>
                p.id === payload.new.id
                  ? {
                      ...updatedPost,
                      profiles: updatedPost.profiles ? {
                        ...updatedPost.profiles,
                        verification_source: updatedPost.profiles.verification_source as 'manual' | 'premium' | null
                      } : p.profiles,
                      replies: p.replies, // preserve existing replies
                      reply_count: p.reply_count,
                      like_count: p.like_count,
                      has_liked: p.has_liked,
                    }
                  : p
              );
            
            setPosts(updatePost);
            setFollowingPosts(updatePost);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          // Remove deleted post from both feeds
          const removePost = (currentPosts: Post[]) =>
            currentPosts.filter((p) => p.id !== payload.old.id);
          
          setPosts(removePost);
          setFollowingPosts(removePost);
        }
      )
      .subscribe();

    const repliesChannel = supabase
      .channel('replies-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_replies' },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status')
            .eq('id', payload.new.author_id)
            .single();

          if (profile) {
            let affiliated_business = null;
            if (profile.affiliated_business_id) {
              const { data: businessData } = await supabase
                .from('profiles')
                .select('avatar_url, display_name')
                .eq('id', profile.affiliated_business_id)
                .single();
              affiliated_business = businessData || null;
            }

            const newReply = { 
              ...payload.new, 
              profiles: { ...profile, affiliated_business } 
            } as Reply;
            addReply(payload.new.post_id, newReply);

            const mentionsAfuAi = /@afuai/i.test(payload.new.content);
            const AI_FEATURES_COMING_SOON = true; // Temporarily disabled
            if (mentionsAfuAi && !AI_FEATURES_COMING_SOON) {
              const { data: postData } = await supabase
                .from('posts')
                .select('content')
                .eq('id', payload.new.post_id)
                .single();

              try {
                await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/afu-ai-reply`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    },
                     body: JSON.stringify({
                      postId: payload.new.post_id,
                      replyContent: payload.new.content,
                      originalPostContent: postData?.content || '',
                      triggerReplyId: payload.new.id,
                    }),
                  }
                );
              } catch (error) {
                console.error('Failed to trigger AfuAI:', error);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'post_replies' },
        (payload) => {
          // Update reply (useful for pinning/unpinning)
          const updateReply = (currentPosts: Post[]) =>
            currentPosts.map((p) => {
              if (p.id === payload.new.post_id) {
                return {
                  ...p,
                  replies: p.replies.map((r) =>
                    r.id === payload.new.id
                      ? { ...r, ...payload.new }
                      : r
                  ),
                };
              }
              return p;
            });
          
          setPosts(updateReply);
          setFollowingPosts(updateReply);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_replies' },
        (payload) => {
          // Remove deleted reply
          const removeReply = (currentPosts: Post[]) =>
            currentPosts.map((p) => {
              if (p.id === payload.old.post_id) {
                return {
                  ...p,
                  replies: p.replies.filter((r) => r.id !== payload.old.id),
                  reply_count: Math.max(0, p.reply_count - 1),
                };
              }
              return p;
            });
          
          setPosts(removeReply);
          setFollowingPosts(removeReply);
        }
      )
      .subscribe();

    const acksChannel = supabase
      .channel('acks-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_acknowledgments' },
        (payload) => {
          // Skip if this is current user's action (already updated optimistically)
          if (payload.new.user_id === user?.id) return;
          
          // Update like count for other users' actions
          const updateLike = (currentPosts: Post[]) =>
            currentPosts.map((p) =>
              p.id === payload.new.post_id
                ? {
                    ...p,
                    like_count: p.like_count + 1,
                  }
                : p
            );
          
          setPosts(updateLike);
          setFollowingPosts(updateLike);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_acknowledgments' },
        (payload) => {
          // Skip if this is current user's action (already updated optimistically)
          if (payload.old.user_id === user?.id) return;
          
          // Update like count for other users' actions
          const updateUnlike = (currentPosts: Post[]) =>
            currentPosts.map((p) =>
              p.id === payload.old.post_id
                ? {
                    ...p,
                    like_count: Math.max(0, p.like_count - 1),
                  }
                : p
            );
          
          setPosts(updateUnlike);
          setFollowingPosts(updateUnlike);
        }
      )
      .subscribe();

    // Subscribe to profile updates
    const profilesChannel = supabase
      .channel('profiles-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          // Update profile info in all posts and replies by this user
          const updateProfile = (currentPosts: Post[]) =>
            currentPosts.map((p) => {
              // Update post author profile
              if (p.author_id === payload.new.id) {
                return {
                  ...p,
                  profiles: {
                    ...p.profiles,
                    display_name: payload.new.display_name || p.profiles.display_name,
                    handle: payload.new.handle || p.profiles.handle,
                    avatar_url: payload.new.avatar_url,
                    banner_url: payload.new.banner_url,
                    bio: payload.new.bio,
                    is_verified: payload.new.is_verified ?? p.profiles.is_verified,
                    is_organization_verified: payload.new.is_organization_verified ?? p.profiles.is_organization_verified,
                    is_business_mode: payload.new.is_business_mode ?? p.profiles.is_business_mode,
                    is_affiliate: payload.new.is_affiliate ?? p.profiles.is_affiliate,
                  },
                };
              }
              
              // Update reply author profiles
              if (p.replies && p.replies.length > 0) {
                const updatedReplies = p.replies.map((r) => {
                  if (r.author_id === payload.new.id) {
                    return {
                      ...r,
                      profiles: {
                        ...r.profiles,
                        display_name: payload.new.display_name || r.profiles.display_name,
                        handle: payload.new.handle || r.profiles.handle,
                        avatar_url: payload.new.avatar_url,
                        is_verified: payload.new.is_verified ?? r.profiles.is_verified,
                        is_organization_verified: payload.new.is_organization_verified ?? r.profiles.is_organization_verified,
                        is_business_mode: payload.new.is_business_mode ?? r.profiles.is_business_mode,
                        is_affiliate: payload.new.is_affiliate ?? r.profiles.is_affiliate,
                      },
                    };
                  }
                  return r;
                });
                
                return { ...p, replies: updatedReplies };
              }
              
              return p;
            });
          
          setPosts(updateProfile);
          setFollowingPosts(updateProfile);
          
          // Update current user profile if it's their own update
          if (user && payload.new.id === user.id) {
            setUserProfile({
              display_name: payload.new.display_name,
              avatar_url: payload.new.avatar_url,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(repliesChannel);
      supabase.removeChannel(acksChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user, addReply]);
  

  // Listen for feed refresh order event (when clicking home button while on home)
  useEffect(() => {
    const handleRefreshFeedOrder = () => {
      // Re-learn interests and refetch with new personalized order
      learnUserInterests();
      setCurrentPage(0);
      setHasMore(true);
      fetchPosts(0, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('refresh-feed-order', handleRefreshFeedOrder);
    return () => {
      window.removeEventListener('refresh-feed-order', handleRefreshFeedOrder);
    };
  }, [fetchPosts, learnUserInterests]);

  // Pull to refresh - enhanced hook
  const handlePullRefresh = useCallback(async () => {
    // Re-learn user interests for personalized feed
    learnUserInterests();
    setCurrentPage(0);
    setHasMore(true);
    setPosts([]);
    setFollowingPosts([]);
    await fetchPosts(0, true);
  }, [fetchPosts, learnUserInterests]);

  const { 
    isRefreshing, 
    pullDistance, 
    progress: pullProgress,
    showSuccess: refreshSuccess,
    refresh: manualRefresh 
  } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    threshold: 100,
    maxPull: 160,
    minPullToActivate: 25,
    disabled: false,
  });

  // Listen for feed refresh event
  useEffect(() => {
    const handleRefresh = () => {
      manualRefresh();
    };
    window.addEventListener('feed-refresh', handleRefresh);
    return () => window.removeEventListener('feed-refresh', handleRefresh);
  }, [manualRefresh]);

  const premiumButton = useMemo(() => {
    // Show stable placeholder during loading to prevent flashing
    if (premiumLoading) {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted" />
      );
    }
    
    if (isPremium && expiresAt) {
      // For subscribers: show subtle verified/premium indicator
      const daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return (
        <Link to="/premium" className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">{daysLeft}d</span>
        </Link>
      );
    }
    
    // For non-subscribers: prominent upgrade button
    return (
      <Link 
        to="/premium" 
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <Crown className="h-4 w-4" />
        <span className="text-xs font-semibold">Get Premium</span>
      </Link>
    );
  }, [isPremium, premiumLoading, expiresAt]);

  if (loading && posts.length === 0 && followingPosts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto pb-20 pt-28">
        <FeedSkeleton />
      </div>
    );
  }

  const currentPosts = activeTab === 'foryou' ? posts : followingPosts;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
        progress={pullProgress}
        showSuccess={refreshSuccess}
      />
      
      <SEO
        title="Feed — Latest Posts, Updates & Trending Topics | AfuChat"
        description="Discover the latest posts, trending topics, viral content, and updates from your network on AfuChat's social feed. Share your thoughts, like posts, comment, and connect with friends and creators. Join conversations happening now on social media."
        keywords="social feed, latest posts, trending topics, social media feed, viral content, user posts, trending hashtags, social updates, share posts, like and comment, follow friends, online feed, social stream, community posts, news feed"
      />
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'foryou' | 'following')} className="w-full">
        {/* Fixed Header with Tabs - works like bottom navigation */}
        <div className={cn(
          "fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/30 transition-transform duration-300",
          isScrollingDown ? "-translate-y-full" : "translate-y-0"
        )}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between px-4 py-3 relative">
              {user ? (
                <ProfileDrawer
                  trigger={
                    <button className="flex-shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  }
                />
              ) : (
                <Link to="/auth/signin" className="flex-shrink-0 text-xs font-medium text-primary hover:underline">
                  Sign In
                </Link>
              )}
              {/* Centered Brand Name */}
              <span className="text-xl font-bold text-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                AfuChat
              </span>
              <div className="flex items-center gap-2">
                {user && premiumButton}
              </div>
            </div>


            <TabsList className="grid grid-cols-2 w-full h-12 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="foryou"
                className="relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none rounded-none font-bold h-full flex items-center gap-1.5 transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-14 data-[state=active]:after:h-1 data-[state=active]:after:bg-primary data-[state=active]:after:rounded-full"
              >
                For you
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none rounded-none font-bold h-full transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-14 data-[state=active]:after:h-1 data-[state=active]:after:bg-primary data-[state=active]:after:rounded-full"
              >
                Following
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Spacer for fixed header */}
        <div className="h-[108px]" />

        {/* Promotional Banners */}
        <ChristmasGiftsBanner />
        <UnclaimedRedEnvelopeBanner />

        {/* Subscription Expiry Reminder Banner */}
        {user && <SubscriptionExpiryBanner daysThreshold={7} />}


        {/* Content area */}
        <TabsContent value={activeTab} className="m-0" ref={feedRef} forceMount>
          {/* Show login prompt for Following tab when not authenticated */}
          {activeTab === 'following' && !user ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">See posts from people you follow</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Sign in and follow users to see their posts here. Discover content from creators you care about.
              </p>
              <Link 
                to="/auth/signin" 
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors"
              >
                Sign in to follow
              </Link>
            </div>
          ) : (
            <>
              {currentPosts.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm px-4">
                  {activeTab === 'following' && user
                    ? 'Follow users to see their posts here'
                    : t('feed.noPostsYet')}
                </div>
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {currentPosts.filter(post => post.profiles).map((post, index) => (
                      <motion.div 
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index < 10 ? index * 0.05 : 0,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        layout
                      >
                        <PostCard
                          post={post}
                          addReply={addReply}
                          user={user as AuthUser | null}
                          navigate={navigate}
                          onAcknowledge={handleAcknowledge}
                          onDeletePost={handleDeletePost}
                          onReportPost={handleReportPost}
                          onEditPost={handleEditPost}
                          onQuotePost={handleQuotePost}
                          onHidePost={handleHidePost}
                          userProfile={userProfile}
                          expandedPosts={expandedPosts}
                          setExpandedPosts={setExpandedPosts}
                          guestMode={guestMode}
                        />
                        
                        {/* Ads removed - coming soon */}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Loading more indicator */}
                  {loadingMore && (
                    <InlineSkeleton className="py-8" />
                  )}

                  {/* Manual load more button as fallback */}
                  {hasMore && !loadingMore && currentPosts.length > 0 && (
                    <div className="py-6 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        className="text-xs sm:text-sm"
                      >
                        {t('feed.loadMore') || 'Load more posts'}
                      </Button>
                    </div>
                  )}
                  
                  {/* End of feed indicator */}
                  {!hasMore && currentPosts.length > 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      {t('feed.noMorePosts') || 'You\'ve reached the end'}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Sheet */}
      <DeletePostSheet
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        onConfirm={confirmDeletePost}
        isDeleting={isDeleting}
      />
      
      {/* Report Post Sheet */}
      <ReportPostSheet
        isOpen={!!reportPostId}
        onClose={() => setReportPostId(null)}
        onReport={confirmReportPost}
      />

      {/* Edit Post Modal */}
      {editPost && (
        <EditPostModal
          isOpen={!!editPost}
          onClose={() => setEditPost(null)}
          post={editPost}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* Quote Post Modal */}
      {quotePost && (
        <NewPostModal
          isOpen={!!quotePost}
          onClose={() => setQuotePost(null)}
          quotedPost={{
            id: quotePost.id,
            content: quotePost.content,
            created_at: quotePost.created_at,
            author_id: quotePost.author_id,
            image_url: quotePost.image_url,
            post_images: quotePost.post_images,
            profiles: {
              display_name: quotePost.profiles.display_name,
              handle: quotePost.profiles.handle,
              is_verified: quotePost.profiles.is_verified,
              is_organization_verified: quotePost.profiles.is_organization_verified,
              avatar_url: quotePost.profiles.avatar_url,
            },
          }}
        />
      )}
    </div>
  );
};

export default Feed;
