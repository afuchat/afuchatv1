import React, { memo } from 'react';
import { useContentTracking } from '@/hooks/useContentTracking';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

interface TrackedPostCardProps {
  postId: string;
  authorId: string;
  content?: string;
  hasMedia?: boolean;
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onClick?: () => void;
  className?: string;
}

/**
 * Wrapper component that tracks user interactions with a post
 * Automatically tracks:
 * - View time (dwell time)
 * - Scroll depth
 * - Click/tap interactions
 * - Swipe gestures
 * - Like, comment, share actions
 */
export const TrackedPostCard = memo(function TrackedPostCard({
  postId,
  authorId,
  content,
  hasMedia,
  children,
  onSwipeLeft,
  onSwipeRight,
  onLike,
  onComment,
  onShare,
  onClick,
  className,
}: TrackedPostCardProps) {
  // Extract hashtags from content
  const hashtags = content?.match(/#\w+/g)?.map(h => h.toLowerCase()) || [];

  // Set up content tracking
  const {
    containerRef,
    trackClick,
    trackLike,
    trackComment,
    trackShare,
    trackSwipeAway,
  } = useContentTracking({
    contentId: postId,
    authorId,
    hashtags,
    hasMedia,
    contentLength: content?.length,
  });

  // Set up swipe gestures
  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: () => {
      trackSwipeAway();
      onSwipeLeft?.();
    },
    onSwipeRight: () => {
      onSwipeRight?.();
    },
    minSwipeDistance: 80,
    maxSwipeTime: 400,
  });

  // Handle click with tracking
  const handleClick = () => {
    trackClick();
    onClick?.();
  };

  // Handle like with tracking
  const handleLike = () => {
    trackLike();
    onLike?.();
  };

  // Handle comment with tracking
  const handleComment = () => {
    trackComment();
    onComment?.();
  };

  // Handle share with tracking
  const handleShare = () => {
    trackShare();
    onShare?.();
  };

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={handleClick}
      {...swipeHandlers}
    >
      {/* Pass tracking handlers to children via context or cloning */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onLikeTracked: handleLike,
            onCommentTracked: handleComment,
            onShareTracked: handleShare,
          });
        }
        return child;
      })}
    </div>
  );
});

export default TrackedPostCard;
