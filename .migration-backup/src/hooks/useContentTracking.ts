import { useEffect, useRef, useCallback } from 'react';
import { useBehavioralLearning, ContentInteraction } from './useBehavioralLearning';

interface TrackingOptions {
  contentId: string;
  authorId?: string;
  category?: string;
  hashtags?: string[];
  hasMedia?: boolean;
  contentLength?: number;
}

/**
 * Hook to track user interactions with a piece of content
 * Automatically tracks:
 * - View time (dwell time)
 * - Scroll depth within content
 * - Click interactions
 */
export function useContentTracking(options: TrackingOptions) {
  const { 
    recordInteraction, 
    startContentView, 
    endContentView 
  } = useBehavioralLearning();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);
  const scrollDepthRef = useRef(0);
  const viewStartRef = useRef<number | null>(null);

  const metadata: ContentInteraction['metadata'] = {
    authorId: options.authorId,
    category: options.category,
    hashtags: options.hashtags,
    hasMedia: options.hasMedia,
    contentLength: options.contentLength,
  };

  // Handle visibility changes using Intersection Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisibleRef.current) {
            // Content became visible
            isVisibleRef.current = true;
            viewStartRef.current = Date.now();
            startContentView(options.contentId);
          } else if (!entry.isIntersecting && isVisibleRef.current) {
            // Content left viewport
            isVisibleRef.current = false;
            endContentView(options.contentId, metadata);
            viewStartRef.current = null;
          }
        });
      },
      {
        threshold: [0.5], // Trigger when 50% visible
        rootMargin: '0px',
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      // End tracking on unmount if still visible
      if (isVisibleRef.current) {
        endContentView(options.contentId, metadata);
      }
    };
  }, [options.contentId, startContentView, endContentView]);

  // Track scroll depth within content
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        scrollDepthRef.current = Math.round((scrollTop / maxScroll) * 100);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Track click interaction
  const trackClick = useCallback(() => {
    const dwellTime = viewStartRef.current ? Date.now() - viewStartRef.current : 0;
    recordInteraction({
      contentId: options.contentId,
      contentType: 'post',
      action: 'click',
      dwellTime,
      scrollDepth: scrollDepthRef.current,
      metadata,
    });
  }, [options.contentId, recordInteraction]);

  // Track like interaction
  const trackLike = useCallback(() => {
    const dwellTime = viewStartRef.current ? Date.now() - viewStartRef.current : 0;
    recordInteraction({
      contentId: options.contentId,
      contentType: 'post',
      action: 'like',
      dwellTime,
      scrollDepth: scrollDepthRef.current,
      metadata,
    });
  }, [options.contentId, recordInteraction]);

  // Track comment interaction
  const trackComment = useCallback(() => {
    const dwellTime = viewStartRef.current ? Date.now() - viewStartRef.current : 0;
    recordInteraction({
      contentId: options.contentId,
      contentType: 'post',
      action: 'comment',
      dwellTime,
      scrollDepth: scrollDepthRef.current,
      metadata,
    });
  }, [options.contentId, recordInteraction]);

  // Track share interaction
  const trackShare = useCallback(() => {
    const dwellTime = viewStartRef.current ? Date.now() - viewStartRef.current : 0;
    recordInteraction({
      contentId: options.contentId,
      contentType: 'post',
      action: 'share',
      dwellTime,
      scrollDepth: scrollDepthRef.current,
      metadata,
    });
  }, [options.contentId, recordInteraction]);

  // Track swipe away (negative signal)
  const trackSwipeAway = useCallback(() => {
    const dwellTime = viewStartRef.current ? Date.now() - viewStartRef.current : 0;
    recordInteraction({
      contentId: options.contentId,
      contentType: 'post',
      action: 'swipe_away',
      dwellTime,
      scrollDepth: scrollDepthRef.current,
      metadata,
    });
  }, [options.contentId, recordInteraction]);

  // Track scroll past (mild negative signal)
  const trackScrollPast = useCallback(() => {
    const dwellTime = viewStartRef.current ? Date.now() - viewStartRef.current : 0;
    // Only track if dwell time was very short
    if (dwellTime < 500) {
      recordInteraction({
        contentId: options.contentId,
        contentType: 'post',
        action: 'scroll_past',
        dwellTime,
        scrollDepth: scrollDepthRef.current,
        metadata,
      });
    }
  }, [options.contentId, recordInteraction]);

  return {
    containerRef,
    trackClick,
    trackLike,
    trackComment,
    trackShare,
    trackSwipeAway,
    trackScrollPast,
  };
}
