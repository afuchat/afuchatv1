import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

/**
 * Hook for observing element intersection with viewport
 * Useful for lazy loading, infinite scroll, and view tracking
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefCallback<Element>, boolean, IntersectionObserverEntry | null] {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const frozen = useRef(false);
  const elementRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: Element | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // If frozen, don't observe new elements
    if (frozen.current) return;

    elementRef.current = node;

    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setEntry(entry);
          setIsVisible(entry.isIntersecting);

          if (freezeOnceVisible && entry.isIntersecting) {
            frozen.current = true;
            observerRef.current?.disconnect();
          }
        },
        { threshold, root, rootMargin }
      );

      observerRef.current.observe(node);
    }
  }, [threshold, root, rootMargin, freezeOnceVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return [setRef, isVisible, entry];
}

/**
 * Hook for tracking when an element enters viewport (for view counting)
 */
export function useViewTracking(
  onView: () => void,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const hasTracked = useRef(false);
  const { threshold = 0.5, rootMargin = '50px' } = options;

  const [ref, isVisible] = useIntersectionObserver({
    threshold,
    rootMargin,
    freezeOnceVisible: true,
  });

  useEffect(() => {
    if (isVisible && !hasTracked.current) {
      hasTracked.current = true;
      onView();
    }
  }, [isVisible, onView]);

  return ref;
}

/**
 * Hook for infinite scroll - triggers callback when sentinel enters view
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  options: { 
    enabled?: boolean; 
    rootMargin?: string;
  } = {}
) {
  const { enabled = true, rootMargin = '200px' } = options;

  const [ref, isVisible] = useIntersectionObserver({
    rootMargin,
    threshold: 0,
  });

  useEffect(() => {
    if (isVisible && enabled) {
      onLoadMore();
    }
  }, [isVisible, enabled, onLoadMore]);

  return ref;
}
