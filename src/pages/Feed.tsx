import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageCircle, Heart, Send, Gift, BarChart2, Crown, Users, MoreHorizontal, Trash2, Flag, Image as ImageIcon, Smile, AtSign, X, ChevronDown } from 'lucide-react';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import aiSparkIcon from '@/assets/ai-chat-icon.ico';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

import { InlineSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
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
import { UnclaimedRedEnvelopeBanner } from '@/components/home/UnclaimedRedEnvelopeBanner';
import { useTelegramOptional } from '@/contexts/TelegramContext';
import { useIsMobile } from '@/hooks/use-mobile';

// ────────────────────────────────────────────────────────────────
// INTERFACES
// ────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ────────────────────────────────────────────────────────────────

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

    navigate(`/@${data.id}`); 
  };
  
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

// ────────────────────────────────────────────────────────────────
// AVATAR DISPLAY COMPONENTS
// ────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────
// REPLY ITEM
// ────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────
// POST CARD
// ────────────────────────────────────────────────────────────────

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
  const [replyingToReply, setReplyingToReply] = useState<{ id: string; handle: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(5);
  const postRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [showViewsSheet, setShowViewsSheet] = useState(false);
  const [commentActionId, setCommentActionId] = useState<string | null>(null);
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [expandedNestedReplies, setExpandedNestedReplies] = useState<Set<string>>(new Set());
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const commentImageInputRef = useRef<HTMLInputElement>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<Array<{ id: string; handle: string; display_name: string; avatar_url: string | null }>>([]);
  const [showOtherReasonInput, setShowOtherReasonInput] = useState(false);
  const [otherReasonText, setOtherReasonText] = useState('');

  const EMOJI_CATEGORIES = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🤫', '🤔'],
    'Gestures': ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👋', '🫶', '❤️', '🔥', '💯', '⭐', '✨'],
    'Faces': ['😢', '😭', '😤', '😠', '🤬', '😈', '💀', '☠️', '💩', '🤡', '👻', '👽', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
    'Objects': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💡', '📸', '🎵', '🎶', '💰', '💎', '🚀', '⚡', '💫', '🌟', '🌈', '☀️', '🌙'],
  };

  const toggleNestedReplies = (replyId: string) => {
    setExpandedNestedReplies(prev => {
      const next = new Set(prev);
      if (next.has(replyId)) next.delete(replyId);
      else next.add(replyId);
      return next;
    });
  };

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setCommentImageFile(file);
    setCommentImagePreview(URL.createObjectURL(file));
  };

  const clearCommentImage = () => {
    setCommentImageFile(null);
    if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
    setCommentImagePreview(null);
  };

  const toggleCommentLike = (commentId: string) => {
    setLikedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
        setCommentLikeCounts(p => ({ ...p, [commentId]: Math.max(0, (p[commentId] || 0) - 1) }));
      } else {
        next.add(commentId);
        setCommentLikeCounts(p => ({ ...p, [commentId]: (p[commentId] || 0) + 1 }));
      }
      return next;
    });
  };

  const openReportCard = (commentId: string) => {
    setReportTargetId(commentId);
    setShowReportCard(true);
    setShowOtherReasonInput(false);
    setOtherReasonText('');
  };

  const handleReplyTextChange = async (value: string) => {
    setReplyText(value);
    const atMatch = value.match(/@(\w{1,})$/);
    if (atMatch && atMatch[1].length >= 1) {
      setMentionQuery(atMatch[1]);
      setShowMentionSuggestions(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .or(`handle.ilike.%\( {atMatch[1]}%,display_name.ilike.% \){atMatch[1]}%`)
        .limit(5);
      setMentionResults(data || []);
    } else {
      setShowMentionSuggestions(false);
      setMentionResults([]);
    }
  };

  const insertMention = (handle: string) => {
    const newText = replyText.replace(/@\w*\( /, `@ \){handle} `);
    setReplyText(newText);
    setShowMentionSuggestions(false);
    commentInputRef.current?.focus();
  };

  useEffect(() => {
    if (!user || !postRef.current || hasTrackedView) return;
    
    const viewKey = `\( {post.id}- \){user.id}`;
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
          
          if (!viewedSet.has(viewKey)) {
            try {
              const { error } = await supabase
                .from('post_views')
                .insert({
                  post_id: post.id,
                  viewer_id: user.id,
                });
              
              if (!error) {
                viewedSet.add(viewKey);
                sessionStorage.setItem('viewedPosts', JSON.stringify(Array.from(viewedSet)));
              }
            } catch (error: any) {
              if (!error?.message?.includes('duplicate')) {
                console.debug('View tracking error:', error);
              }
            }
          }
        }
      },
      { threshold: 0.5, rootMargin: '50px' }
    );

    observer.observe(postRef.current);

    return () => observer.disconnect();
  }, [user, post.id, hasTrackedView]);
  
  const organizeReplies = (replies: Reply[]): Reply[] => {
    const replyMap = new Map<string, Reply>();
    const topLevelReplies: Reply[] = [];

    replies.forEach(reply => {
      replyMap.set(reply.id, { ...reply, nested_replies: [] });
    });

    replies.forEach(reply => {
      const replyWithNested = replyMap.get(reply.id)!;
      if (reply.parent_reply_id && replyMap.has(reply.parent_reply_id)) {
        const parent = replyMap.get(reply.parent_reply_id)!;
        parent.nested_replies!.push(replyWithNested);
      } else {
        topLevelReplies.push(replyWithNested);
      }
    });

    const sortReplies = (repliesToSort: Reply[]): Reply[] => {
      return repliesToSort.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    };

    return sortReplies(topLevelReplies);
  };

  const organizedReplies = organizeReplies(post.replies || []);
  
  const handleViewProfile = (userId: string) => {
    navigate(`/@${userId}`);
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
    const shareUrl = `\( {window.location.origin}/post/ \){post.id}`;
    const shareData = {
      title: `Check out this post by ${post.profiles.display_name}`,
      text: post.content.substring(0, 100) + '...',
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      navigator.share(shareData).catch((error) => {
        console.error('Error sharing', error);
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
    if (!replyText.trim()) return;
    if (!user || guestMode) {
      toast.info('Please sign in to comment on posts', {
        action: {
          label: 'Sign In',
          onClick: () => navigate('/auth/signin')
        }
      });
      return;
    }

    const trimmedReplyText = replyText.trim();
    const replyToHandle = replyingToReply ? `@${replyingToReply.handle}` : '';
    const hasMention = replyToHandle && trimmedReplyText.includes(replyToHandle);
    const finalContent = (replyToHandle && !hasMention) ? `${replyToHandle} ${trimmedReplyText}` : trimmedReplyText;
    const parentId = replyingToReply?.id || null;
    const tempId = `temp-reply-${Date.now()}`;
    
    const optimisticReply: Reply = {
      id: tempId,
      post_id: post.id,
      author_id: user.id,
      content: finalContent,
      created_at: new Date().toISOString(),
      parent_reply_id: parentId,
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
    
    addReply(post.id, optimisticReply);
    setReplyText('');
    setReplyingToReply(null);
    setShowComments(true);

    try {
      const { data: newReply, error } = await supabase
        .from('post_replies')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: finalContent,
          parent_reply_id: parentId,
        })
        .select('*, profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, verification_source)')
        .single();

      if (error) throw error;

      if (newReply) {
        let affiliated_business = null;
        if (newReply.profiles?.affiliated_business_id) {
          const { data: businessData } = await supabase
            .from('profiles')
            .select('avatar_url, display_name')
            .eq('id', newReply.profiles.affiliated_business_id)
            .single();
          affiliated_business = businessData || null;
        }

        toast.success('Reply posted!');
        awardNexa('create_reply', { post_id: post.id });
        
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
      
      window.dispatchEvent(new CustomEvent('remove-optimistic-reply', { 
        detail: { postId: post.id, replyId: tempId } 
      }));
      
      setReplyText(trimmedReplyText);
    }
  };

  const handleReplyToReply = async (parentReplyId: string, content: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const tempId = `temp-nested-reply-${Date.now()}`;
    
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

      toast.success('Reply posted!');
      awardNexa('create_reply', { post_id: post.id });
    } catch (error) {
      console.error('Nested reply error:', error);
      toast.error('Failed to post reply. Please try again.');
      
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
  };

  const handleReportComment = async (replyId: string, reason: string) => {
    if (!user) {
      toast.error('Please sign in to report');
      return;
    }
    console.log('Comment reported:', { replyId, reason, reporter: user.id });
    toast.success('Comment reported. We\'ll review it shortly.');
    setShowReportCard(false);
    setReportTargetId(null);
  };

  return (
    <div ref={postRef} className="border-b border-border/40 bg-background transition-colors">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex-shrink-0 cursor-pointer"
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
          <div className="min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span
                className="font-bold text-foreground text-sm cursor-pointer hover:underline truncate max-w-[130px]"
                onClick={() => handleViewProfile(post.author_id)}
                title={post.profiles.display_name}
              >
                {post.profiles.display_name}
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
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">{formatTime(post.created_at)}</span>
            </div>
            <span
              className="text-muted-foreground text-xs cursor-pointer hover:underline"
              onClick={() => handleViewProfile(post.author_id)}
            >
              @{post.profiles.handle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            className="p-1.5 opacity-60 hover:opacity-100 transition-opacity" 
            title={t('feed.analyzePost')}
            onClick={handleAiTransfer}
          >
            <img src={aiSparkIcon} alt="AI" className="h-5 w-5 select-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
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

      <div>
        {((post.post_images && post.post_images.length > 0) || post.image_url) && (
          <div className="w-full">
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
              className="rounded-none"
            />
          </div>
        )}

        {post.quoted_post && (
          <div className="px-3 pt-2">
            <QuotedPostCard quotedPost={post.quoted_post} />
          </div>
        )}
      </div>

      <div className="px-3 pt-2 pb-1">
        <ReadMoreText
          text={parsePostContent(translatedContent || post.content, post.id, navigate)}
          maxLines={3}
          minCharsToShow={0}
          className="text-foreground text-sm whitespace-pre-wrap"
        />
        {i18n.language !== 'en' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleTranslate();
            }}
            disabled={isTranslating}
            className="text-xs text-muted-foreground hover:text-primary mt-0.5 p-0 h-auto"
          >
            {isTranslating ? t('common.translating') : translatedContent ? t('common.showOriginal') : t('common.translate')}
          </Button>
        )}
      </div>

      {post.content.length >= 150 && (
        <div className="px-3 pb-1">
          <AIPostSummary postContent={post.content} postId={post.id} />
        </div>
      )}

      <div className="flex justify-between items-center px-3 py-1">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5 group h-9 px-1" onClick={() => onAcknowledge(post.id, post.has_liked)}>
            <Heart className={`h-6 w-6 transition-all ${post.has_liked ? 'text-red-500 fill-red-500 scale-110' : 'group-hover:text-red-500'}`} strokeWidth={1.5} />
            {post.like_count > 0 && <span className="text-xs font-semibold text-foreground">{post.like_count.toLocaleString()}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5 group h-9 px-1" onClick={() => {
            setShowComments(true);
          }}>
            <MessageCircle className="h-6 w-6 group-hover:text-primary transition-colors" strokeWidth={1.5} />
            {post.reply_count > 0 && <span className="text-xs text-muted-foreground">{post.reply_count}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5 group h-9 px-1" onClick={handleShare}>
            <Send className="h-5 w-5 group-hover:text-primary transition-colors" strokeWidth={1.5} />
          </Button>
          {user && user.id !== post.author_id && (
            <SendGiftDialog
              receiverId={post.author_id}
              receiverName={post.profiles.display_name}
              trigger={
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5 group h-9 px-1">
                  <Gift className="h-5 w-5 group-hover:text-pink-500 transition-colors" strokeWidth={1.5} />
                </Button>
              }
            />
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1 group h-9 px-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowViewsSheet(true);
          }}
        >
          <BarChart2 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
          <span className="text-xs text-muted-foreground">{post.view_count > 0 ? post.view_count : ''}</span>
        </Button>
      </div>

      {!showComments && post.reply_count > 0 && (
        <div 
          className="px-3 pb-2 flex items-center gap-2 cursor-pointer group"
          onClick={() => setShowComments(true)}
        >
          <div className="flex items-center -space-x-2">
            {organizedReplies.slice(0, 3).map((reply, idx) => (
              <Avatar 
                key={reply.id} 
                className="h-7 w-7 ring-2 ring-background border-0 shadow-none"
                style={{ zIndex: 3 - idx }}
              >
                <AvatarImage src={reply.profiles.avatar_url || undefined} alt={reply.profiles.display_name} />
                <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                  {reply.profiles.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            {post.reply_count === 1 
              ? 'View 1 comment' 
              : `View all ${post.reply_count} comments`}
          </span>
        </div>
      )}

      <Drawer open={showComments} onOpenChange={(open) => { setShowComments(open); if (!open) clearCommentImage(); }}>
        <DrawerContent className="max-h-[85vh] flex flex-col rounded-t-3xl">
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          
          <DrawerHeader className="border-b border-border/30 py-2.5 px-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="w-8" />
              <DrawerTitle className="text-sm font-bold tracking-tight">
                {post.reply_count || post.replies?.length || 0} comments
              </DrawerTitle>
              <button onClick={() => setShowComments(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {post.replies && post.replies.length > 0 ? (
              <div className="space-y-4">
                {organizedReplies.slice(0, visibleRepliesCount).map((reply) => (
                  <div key={reply.id} className="flex gap-3">
                    <div className="flex-shrink-0 cursor-pointer" onClick={() => { handleViewProfile(reply.author_id); setShowComments(false); }}>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={reply.profiles.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground font-semibold">{reply.profiles.display_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span 
                              className="font-semibold text-[13px] text-foreground cursor-pointer hover:underline" 
                              onClick={() => { handleViewProfile(reply.author_id); setShowComments(false); }}
                            >
                              {reply.profiles.display_name}
                            </span>
                            <VerifiedBadge 
                              isVerified={reply.profiles.is_verified || reply.is_developer}
                              isOrgVerified={reply.profiles.is_organization_verified}
                              isAffiliate={reply.profiles.is_affiliate}
                              isDeveloper={reply.is_developer}
                              size="sm"
                              userId={reply.author_id}
                            />
                          </div>
                          <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                            {parsePostContent(reply.content, reply.id, navigate)}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1">
                          <button onClick={() => toggleCommentLike(reply.id)} className="p-1">
                            <Heart 
                              className={cn("h-3.5 w-3.5 transition-colors", likedComments.has(reply.id) ? "fill-red-500 text-red-500" : "text-muted-foreground")} 
                              strokeWidth={1.5} 
                            />
                          </button>
                          {(commentLikeCounts[reply.id] || 0) > 0 && (
                            <span className="text-[10px] text-muted-foreground font-medium">{commentLikeCounts[reply.id]}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">{formatTime(reply.created_at)}</span>
                        <button 
                          className="text-[11px] text-muted-foreground font-semibold hover:text-foreground transition-colors"
                          onClick={() => {
                            setReplyingToReply({ id: reply.id, handle: reply.profiles.handle });
                            setReplyText('');
                            setTimeout(() => commentInputRef.current?.focus(), 100);
                          }}
                        >Reply</button>
                        {user?.id === reply.author_id && (
                          <button 
                            className="text-[11px] text-muted-foreground hover:text-destructive font-semibold transition-colors"
                            onClick={() => { setCommentActionId(reply.id); setShowDeleteCommentConfirm(true); }}
                          >Delete</button>
                        )}
                        {user && user.id !== reply.author_id && (
                          <button 
                            className="text-[11px] text-muted-foreground hover:text-destructive font-semibold transition-colors"
                            onClick={() => openReportCard(reply.id)}
                          >Report</button>
                        )}
                      </div>
                      
                      {reply.nested_replies && reply.nested_replies.length > 0 && (
                        <div className="mt-2">
                          <button 
                            className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-semibold hover:text-foreground transition-colors"
                            onClick={() => toggleNestedReplies(reply.id)}
                          >
                            <div className="w-6 h-[1px] bg-muted-foreground/30" />
                            {expandedNestedReplies.has(reply.id) 
                              ? `Hide replies` 
                              : `View ${reply.nested_replies.length} ${reply.nested_replies.length === 1 ? 'reply' : 'replies'}`}
                            <ChevronDown className={cn("h-3 w-3 transition-transform", expandedNestedReplies.has(reply.id) && "rotate-180")} />
                          </button>
                          
                          <AnimatePresence>
                            {expandedNestedReplies.has(reply.id) && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 ml-1 space-y-3">
                                  {reply.nested_replies.map((nested) => {
                                    const contentText = nested.content.replace(/^@\S+\s*/, '');
                                    const mentionedHandle = nested.content.match(/^@(\S+)/)?.[1];
                                    
                                    return (
                                      <div key={nested.id} className="flex gap-2.5">
                                        <Avatar className="h-7 w-7 flex-shrink-0">
                                          <AvatarImage src={nested.profiles.avatar_url || undefined} />
                                          <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-semibold">{nested.profiles.display_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                              <span className="font-semibold text-xs text-foreground">{nested.profiles.display_name}</span>
                                              {mentionedHandle && (
                                                <span className="text-[10px] text-primary/60 font-medium ml-1">→ @{mentionedHandle}</span>
                                              )}
                                              <p className="text-[13px] text-foreground/85 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                                                {parsePostContent(contentText || nested.content, nested.id, navigate)}
                                              </p>
                                            </div>
                                            <button onClick={() => toggleCommentLike(nested.id)} className="p-1 flex-shrink-0 pt-0.5">
                                              <Heart 
                                                className={cn("h-3 w-3 transition-colors", likedComments.has(nested.id) ? "fill-red-500 text-red-500" : "text-muted-foreground")} 
                                                strokeWidth={1.5} 
                                              />
                                            </button>
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-muted-foreground">{formatTime(nested.created_at)}</span>
                                            {(commentLikeCounts[nested.id] || 0) > 0 && (
                                              <span className="text-[10px] text-muted-foreground font-medium">{commentLikeCounts[nested.id]} likes</span>
                                            )}
                                            {user?.id === nested.author_id && (
                                              <button 
                                                className="text-[10px] text-muted-foreground hover:text-destructive font-semibold transition-colors"
                                                onClick={() => { setCommentActionId(nested.id); setShowDeleteCommentConfirm(true); }}
                                              >Delete</button>
                                            )}
                                            {user && user.id !== nested.author_id && (
                                              <button 
                                                className="text-[10px] text-muted-foreground hover:text-destructive font-semibold transition-colors"
                                                onClick={() => openReportCard(nested.id)}
                                              >Report</button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {organizedReplies.length > visibleRepliesCount && (
                  <button
                    onClick={() => setVisibleRepliesCount(prev => prev + 10)}
                    className="text-primary text-xs font-semibold py-2 w-full text-center hover:text-primary/80 transition-colors"
                  >
                    View more comments
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <MessageCircle className="h-7 w-7 text-muted-foreground/40" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-foreground">No comments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts.</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 bg-background border-t border-border/30 relative">
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-border/20"
                >
                  <div className="px-3 py-3 max-h-[200px] overflow-y-auto">
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                      <div key={category} className="mb-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{category}</p>
                        <div className="flex flex-wrap gap-0.5">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              className="text-xl p-1.5 rounded-lg hover:bg-muted/60 active:scale-90 transition-all"
                              onClick={() => {
                                setReplyText(prev => prev + emoji);
                                commentInputRef.current?.focus();
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showMentionSuggestions && mentionResults.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-b border-border/20"
                >
                  <div className="px-4 py-2 space-y-1">
                    {mentionResults.map((profile) => (
                      <button
                        key={profile.id}
                        className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors"
                        onClick={() => insertMention(profile.handle)}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-semibold">{profile.display_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-foreground">{profile.display_name}</p>
                          <p className="text-[10px] text-muted-foreground">@{profile.handle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {commentImagePreview && (
              <div className="px-4 pt-3 pb-1">
                <div className="relative inline-block">
                  <img src={commentImagePreview} alt="Upload preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
                  <button 
                    onClick={clearCommentImage}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground/80 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-background" />
                  </button>
                </div>
              </div>
            )}
            
            {replyingToReply && user && (
              <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/20">
                <span className="text-xs text-muted-foreground">
                  Replying to <span className="font-semibold text-foreground">@{replyingToReply.handle}</span>
                </span>
                <button 
                  className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors" 
                  onClick={() => { setReplyingToReply(null); setReplyText(''); }}
                >
                  Cancel
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => handleReplyTextChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                        e.preventDefault();
                        handleReplySubmit();
                        setShowEmojiPicker(false);
                      }
                    }}
                    onFocus={() => setShowMentionSuggestions(false)}
                    placeholder="Add comment..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
                  />
                  <input
                    ref={commentImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCommentImageSelect}
                  />
                  <button 
                    onClick={() => commentImageInputRef.current?.click()}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => { setShowEmojiPicker(prev => !prev); setShowMentionSuggestions(false); }}
                    className={cn("p-1.5 transition-colors", showEmojiPicker ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => { 
                      setReplyText(prev => prev + '@'); 
                      commentInputRef.current?.focus();
                      setShowEmojiPicker(false);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <AtSign className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => { handleReplySubmit(); setShowEmojiPicker(false); }}
                  disabled={!replyText.trim() && !commentImageFile}
                  className={cn(
                    "text-sm font-bold transition-all flex-shrink-0",
                    (replyText.trim() || commentImageFile) 
                      ? 'text-primary hover:text-primary/80 active:scale-95' 
                      : 'text-primary/30 cursor-default'
                  )}
                >
                  Post
                </button>
              </div>
            ) : (
              <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                <Link to="/auth/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
                <span className="ml-1">to comment</span>
              </div>
            )}

            <AnimatePresence>
              {showDeleteCommentConfirm && (
                <>
                  <div className="fixed inset-0 z-[9]" onClick={() => { setShowDeleteCommentConfirm(false); setCommentActionId(null); }} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="absolute bottom-full right-4 mb-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10"
                  >
                    <div className="p-3">
                      <p className="text-[13px] font-semibold text-foreground">Delete comment?</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">This can't be undone.</p>
                    </div>
                    <div className="border-t border-border flex">
                      <button 
                        className="flex-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                        onClick={() => { setShowDeleteCommentConfirm(false); setCommentActionId(null); }}
                      >
                        Cancel
                      </button>
                      <div className="w-px bg-border" />
                      <button 
                        className="flex-1 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => {
                          if (commentActionId) handleDeleteReply(commentActionId);
                          setShowDeleteCommentConfirm(false);
                          setCommentActionId(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showReportCard && (
                <>
                  <div className="fixed inset-0 z-[9]" onClick={() => { setShowReportCard(false); setReportTargetId(null); setShowOtherReasonInput(false); setOtherReasonText(''); }} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="absolute bottom-full right-4 mb-2 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10"
                  >
                    <div className="py-1.5">
                      {[
                        { key: 'spam', label: 'Spam or misleading', icon: '🚫' },
                        { key: 'harassment', label: 'Harassment', icon: '😤' },
                        { key: 'hate_speech', label: 'Hate speech', icon: '🛑' },
                        { key: 'inappropriate', label: 'Inappropriate', icon: '⚠️' },
                      ].map((reason) => (
                        <button
                          key={reason.key}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-muted/50 transition-colors active:bg-muted"
                          onClick={() => reportTargetId && handleReportComment(reportTargetId, reason.key)}
                        >
                          <span className="text-sm">{reason.icon}</span>
                          <span className="text-[13px] text-foreground">{reason.label}</span>
                        </button>
                      ))}
                      {!showOtherReasonInput ? (
                        <button
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-muted/50 transition-colors active:bg-muted"
                          onClick={() => setShowOtherReasonInput(true)}
                        >
                          <span className="text-sm">📝</span>
                          <span className="text-[13px] text-foreground">Something else</span>
                        </button>
                      ) : (
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={otherReasonText}
                              onChange={(e) => setOtherReasonText(e.target.value)}
                              placeholder="Describe the issue..."
                              autoFocus
                              className="flex-1 text-[13px] bg-muted/50 border border-border/50 rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 min-w-0"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && otherReasonText.trim() && reportTargetId) {
                                  handleReportComment(reportTargetId, `other: ${otherReasonText.trim()}`);
                                  setOtherReasonText('');
                                  setShowOtherReasonInput(false);
                                }
                              }}
                            />
                            <button
                              disabled={!otherReasonText.trim()}
                              onClick={() => {
                                if (reportTargetId && otherReasonText.trim()) {
                                  handleReportComment(reportTargetId, `other: ${otherReasonText.trim()}`);
                                  setOtherReasonText('');
                                  setShowOtherReasonInput(false);
                                }
                              }}
                              className={cn("text-xs font-bold transition-all", otherReasonText.trim() ? "text-primary" : "text-primary/30")}
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </DrawerContent>
      </Drawer>

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
// ────────────────────────────────────────────────────────────────
// FEED MAIN COMPONENT
// ────────────────────────────────────────────────────────────────

interface FeedProps {
  defaultTab?: 'foryou' | 'following';
  guestMode?: boolean;
}

const Feed = ({ defaultTab = 'foryou', guestMode = false }: FeedProps = {}) => {
  const { t } = useTranslation();
  const { awardNexa } = useNexa();
  const { user } = useAuth();
  const navigate = useNavigate();
  const telegram = useTelegramOptional();
  const isMobile = useIsMobile();

  const { isPremium, loading: premiumLoading, expiresAt } = usePremiumStatus();
  const { sortPosts, recordInteraction, learnUserInterests } = useFeedAlgorithm();

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

  const feedContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Telegram fix
  useEffect(() => {
    if (telegram?.isTelegram && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes();
      tg.expand();
    }
  }, [telegram?.isTelegram]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    sessionStorage.removeItem('feedPosts');
    sessionStorage.removeItem('feedFollowingPosts');
    sessionStorage.removeItem('feedShuffleSeed');

    if (user) sessionStorage.removeItem(`feedSortSeed:${user.id}`);
    else sessionStorage.removeItem('feedSortSeed:guest');

    const cachedTab = sessionStorage.getItem('feedActiveTab');
    if (cachedTab) setActiveTab(cachedTab as 'foryou' | 'following');

    setCurrentPage(0);
    setHasMore(true);
    fetchPosts(0, true);
  }, [user]);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => data && setUserProfile(data));
    }
  }, [user]);

  useEffect(() => {
    sessionStorage.setItem('feedActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (posts.length > 0) {
      const pos = sessionStorage.getItem('feedScrollPosition');
      if (pos) setTimeout(() => window.scrollTo(0, Number(pos)), 50);
    }
  }, [posts.length]);

  const addReply = useCallback((postId: string, newReply: Reply) => {
    const update = (arr: Post[]) =>
      arr.map(p =>
        p.id === postId
          ? {
              ...p,
              replies: [...(p.replies || []), newReply].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              ),
              reply_count: (p.reply_count || 0) + 1,
            }
          : p
      );

    setPosts(update);
    setFollowingPosts(update);
  }, []);

  // Optimistic post/reply events
  useEffect(() => {
    const onAdd = (e: CustomEvent) => {
      const p = e.detail;
      setPosts(prev => [p, ...prev]);
      setFollowingPosts(prev => [p, ...prev]);
    };

    const onSuccess = (e: CustomEvent) => {
      const { tempId } = e.detail;
      setPosts(prev => prev.filter(p => p.id !== tempId));
      setFollowingPosts(prev => prev.filter(p => p.id !== tempId));
    };

    const onError = (e: CustomEvent) => {
      const tempId = e.detail;
      setPosts(prev => prev.filter(p => p.id !== tempId));
      setFollowingPosts(prev => prev.filter(p => p.id !== tempId));
    };

    const onOwnCreated = async (e: CustomEvent) => {
      const data = e.detail;
      const { data: fresh } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(display_name, handle, is_verified, is_organization_verified, is_affiliate, is_business_mode, avatar_url, affiliated_business_id, last_seen, show_online_status, verification_source),
          post_images(image_url, display_order, alt_text),
          post_link_previews(url, title, description, image_url, site_name)
        `)
        .eq('id', data.id)
        .single();

      if (fresh) {
        const mapped = {
          ...fresh,
          profiles: fresh.profiles || { display_name: 'Unknown', handle: 'unknown', is_verified: false, is_organization_verified: false, is_affiliate: false, verification_source: null },
          replies: [],
          reply_count: 0,
          like_count: 0,
          has_liked: false,
        };
        setPosts(prev => [mapped, ...prev.filter(p => p.id !== data.id)]);
        setFollowingPosts(prev => [mapped, ...prev.filter(p => p.id !== data.id)]);
      }
    };

    const onRemoveReply = (e: CustomEvent) => {
      const { postId, replyId } = e.detail;
      const updater = (arr: Post[]) =>
        arr.map(p =>
          p.id === postId
            ? {
                ...p,
                replies: p.replies.filter(r => r.id !== replyId),
                reply_count: Math.max(0, p.reply_count - 1),
              }
            : p
        );
      setPosts(updater);
      setFollowingPosts(updater);
    };

    window.addEventListener('optimistic-post-add', onAdd as any);
    window.addEventListener('optimistic-post-success', onSuccess as any);
    window.addEventListener('optimistic-post-error', onError as any);
    window.addEventListener('own-post-created', onOwnCreated as any);
    window.addEventListener('remove-optimistic-reply', onRemoveReply as any);

    return () => {
      window.removeEventListener('optimistic-post-add', onAdd as any);
      window.removeEventListener('optimistic-post-success', onSuccess as any);
      window.removeEventListener('optimistic-post-error', onError as any);
      window.removeEventListener('own-post-created', onOwnCreated as any);
      window.removeEventListener('remove-optimistic-reply', onRemoveReply as any);
    };
  }, []);

  const handleAcknowledge = useCallback(async (postId: string, hasLiked: boolean) => {
    if (!user || guestMode) {
      toast.info('Sign in to like posts', {
        action: { label: 'Sign in', onClick: () => navigate('/auth/signin') }
      });
      return;
    }

    const update = (list: Post[]) =>
      list.map(p =>
        p.id === postId
          ? { ...p, has_liked: !hasLiked, like_count: p.like_count + (hasLiked ? -1 : 1) }
          : p
      );

    setPosts(update);
    setFollowingPosts(update);

    try {
      if (hasLiked) {
        await supabase.from('post_acknowledgments').delete().match({ post_id: postId, user_id: user.id });
      } else {
        await supabase.from('post_acknowledgments').upsert(
          { post_id: postId, user_id: user.id },
          { onConflict: 'post_id,user_id', ignoreDuplicates: true }
        );

        awardNexa('give_reaction', { post_id: postId });

        const p = posts.find(x => x.id === postId) || followingPosts.find(x => x.id === postId);
        if (p) {
          recordInteraction('like', p.content, p.author_id);
          if (p.author_id !== user.id) {
            fetch('https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/award-xp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: JSON.stringify({
                userId: p.author_id,
                actionType: 'receive_reaction',
                xpAmount: 2,
                metadata: { post_id: postId, from_user_id: user.id },
              }),
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(hasLiked ? 'Failed to unlike' : 'Failed to like');
      setPosts(update);
      setFollowingPosts(update);
    }
  }, [user, guestMode, navigate, posts, followingPosts, awardNexa, recordInteraction]);

  const handleDeletePost = (id: string) => setDeletePostId(id);

  const confirmDeletePost = async () => {
    if (!deletePostId || !user) return;
    setIsDeleting(true);

    const post = posts.find(p => p.id === deletePostId);
    if (post?.author_id !== user.id) {
      toast.error("You can only delete your own posts");
      setIsDeleting(false);
      setDeletePostId(null);
      return;
    }

    setPosts(p => p.filter(x => x.id !== deletePostId));
    setFollowingPosts(p => p.filter(x => x.id !== deletePostId));

    const { error } = await supabase.from('posts').delete().eq('id', deletePostId).eq('author_id', user.id);

    if (error) {
      toast.error('Delete failed');
      fetchPosts(0, true);
    } else {
      toast.success('Post deleted');
    }

    setIsDeleting(false);
    setDeletePostId(null);
  };

  const handleReportPost = (id: string) => setReportPostId(id);

  const confirmReportPost = (reason: string) => {
    if (!reportPostId || !user) return;
    console.log(`Reported ${reportPostId} by ${user.id}: ${reason}`);
    toast.success('Report submitted');
    setReportPostId(null);
  };

  const handleHidePost = (id: string) => {
    setPosts(p => p.filter(x => x.id !== id));
    setFollowingPosts(p => p.filter(x => x.id !== id));
  };

  const handleEditPost = (id: string) => {
    if (!user) return navigate('/auth');
    const p = posts.find(x => x.id === id) || followingPosts.find(x => x.id === id);
    if (p) setEditPost(p);
  };

  const handlePostUpdated = () => {
    fetchPosts(0, true);
    setEditPost(null);
  };

  const handleQuotePost = (p: Post) => {
    if (!user) return navigate('/auth');
    setQuotePost(p);
  };

  const fetchPosts = useCallback(async (page = 0, initial = false) => {
    if (initial) setLoading(true);
    else setLoadingMore(true);

    try {
      const perPage = 25;
      const from = page * perPage;
      const to = from + perPage - 1;

      const { data: feedData, error } = await supabase
        .from('posts')
        .select(`
          id, content, created_at, updated_at, author_id, view_count, image_url, quoted_post_id, is_blocked,
          profiles!inner(*),
          post_images(*),
          post_link_previews(*)
        `)
        .eq('is_blocked', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setHasMore(feedData.length === perPage);

      let followingData: any[] = [];
      if (user) {
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        if (follows?.length) {
          const ids = follows.map(f => f.following_id);
          const { data } = await supabase
            .from('posts')
            .select(`
              id, content, created_at, updated_at, author_id, view_count, image_url, quoted_post_id, is_blocked,
              profiles!inner(*),
              post_images(*),
              post_link_previews(*)
            `)
            .in('author_id', ids)
            .eq('is_blocked', false)
            .order('created_at', { ascending: false })
            .limit(50);
          followingData = data ?? [];
        }
      }

      // enrich logic (replies, likes, quoted, business, affiliate, dev) ...
      // ... (same as your original fetchPosts body)

      const mappedFeed = /* mapped */;
      const mappedFollowing = /* mapped */;

      const sortedFeed = user ? sortPosts(mappedFeed) : shuffle(mappedFeed);

      if (initial) {
        setPosts(sortedFeed);
        setFollowingPosts(mappedFollowing);
      } else {
        setPosts(prev => [...prev, ...sortedFeed.filter(p => !prev.some(ep => ep.id === p.id))]);
        setFollowingPosts(prev => [...prev, ...mappedFollowing.filter(p => !prev.some(ep => ep.id === p.id))]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Feed load failed');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, sortPosts]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchPosts(currentPage + 1, false);
    setCurrentPage(p => p + 1);
  }, [loadingMore, hasMore, loading, currentPage, fetchPosts]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) handleLoadMore();
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, loadingMore, loading]);

  // real-time subscriptions (your original code here)
  useEffect(() => {
    // postsChannel, repliesChannel, acksChannel, profilesChannel ...
    // cleanup return
  }, [user, addReply]);

  const handlePullRefresh = useCallback(async () => {
    learnUserInterests();
    setCurrentPage(0);
    setHasMore(true);
    await fetchPosts(0, true);
  }, [fetchPosts, learnUserInterests]);

  const { isRefreshing, pullDistance, progress: pullProgress, showSuccess, refresh: manualRefresh } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    containerRef: feedContainerRef,
    threshold: 80,
  });

  useEffect(() => {
    const h = () => manualRefresh();
    window.addEventListener('feed-refresh', h);
    return () => window.removeEventListener('feed-refresh', h);
  }, [manualRefresh]);

  const premiumButton = useMemo(() => {
    if (premiumLoading) return <div className="w-8 h-8 rounded-full bg-muted" />;
    if (isPremium && expiresAt) {
      const days = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
      return (
        <Link to="/premium" className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">{days}d</span>
        </Link>
      );
    }
    return (
      <Link to="/premium" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-semibold hover:opacity-90">
        <Crown className="h-4 w-4" />
        Get Premium
      </Link>
    );
  }, [isPremium, premiumLoading, expiresAt]);

  if (loading && !posts.length && !followingPosts.length) {
    return (
      <div className="max-w-4xl mx-auto pb-20 pt-28">
        <FeedSkeleton />
      </div>
    );
  }

  const currentPosts = activeTab === 'foryou' ? posts : followingPosts;

  return (
    <div 
      ref={feedContainerRef}
      className="max-w-4xl mx-auto pb-20 scroll-smooth h-full overflow-y-auto"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
        progress={pullProgress}
        showSuccess={showSuccess}
      />
      
      <SEO
        title="Feed — Latest Posts, Updates & Trending Topics | AfuChat"
        description="Discover the latest posts, trending topics, viral content, and updates from your network on AfuChat's social feed. Share your thoughts, like posts, comment, and connect with friends and creators. Join conversations happening now on social media."
        keywords="social feed, latest posts, trending topics, social media feed, viral content, user posts, trending hashtags, social updates, share posts, like and comment, follow friends, online feed, social stream, community posts, news feed"
      />
      
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'foryou' | 'following')} className="w-full">
        <div className={cn(
          "z-40 bg-background/95 backdrop-blur-md border-b border-border/30 transition-transform duration-300",
          isMobile 
            ? cn(
                "fixed left-0 right-0",
                telegram?.isTelegram ? "top-[var(--tg-safe-top,0px)]" : "top-0",
                isScrollingDown ? "-translate-y-full" : "translate-y-0"
              )
            : "sticky top-0"
        )}>
          <div className={cn(isMobile && "max-w-4xl mx-auto")}>
            {isMobile && (
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
                <span className="text-xl font-bold text-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                  AfuChat
                </span>
                <div className="flex items-center gap-2">
                  {user && premiumButton}
                </div>
              </div>
            )}

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

        {isMobile && <div className="h-[108px]" />}

        <UnclaimedRedEnvelopeBanner />
        {user && <SubscriptionExpiryBanner daysThreshold={7} />}

        <TabsContent value={activeTab} className="m-0" forceMount>
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
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ 
                          duration: 0.25, 
                          delay: index < 5 ? index * 0.03 : 0,
                          ease: [0.25, 0.1, 0.25, 1]
                        }}
                        layout="position"
                        layoutId={post.id}
                        style={{ 
                          willChange: 'transform, opacity',
                          contain: 'layout style paint',
                        }}
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
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div ref={loadMoreRef} className="h-10" />

                  {loadingMore && (
                    <div className="py-6 flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">Loading more posts...</span>
                    </div>
                  )}

                  {!hasMore && currentPosts.length > 0 && !loadingMore && (
                    <div className="py-8 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                        <span className="text-sm text-muted-foreground">
                          {t('feed.noMorePosts') || "You've caught up with everything!"}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <DeletePostSheet
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        onConfirm={confirmDeletePost}
        isDeleting={isDeleting}
      />
      
      <ReportPostSheet
        isOpen={!!reportPostId}
        onClose={() => setReportPostId(null)}
        onReport={confirmReportPost}
      />

      {editPost && (
        <EditPostModal
          isOpen={!!editPost}
          onClose={() => setEditPost(null)}
          post={editPost}
          onPostUpdated={handlePostUpdated}
        />
      )}

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
