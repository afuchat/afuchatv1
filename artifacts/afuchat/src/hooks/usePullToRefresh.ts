import { useState, useRef, useEffect, useCallback, RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  /** Optional: pass the actual scroll container element (recommended). */
  containerRef?: RefObject<HTMLElement>;
  threshold?: number;
  disabled?: boolean;
}

const isScrollableY = (el: HTMLElement) => {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  return (
    (overflowY === 'auto' || overflowY === 'scroll') &&
    el.scrollHeight > el.clientHeight
  );
};

const findScrollableParent = (start: HTMLElement | null): HTMLElement | null => {
  let el: HTMLElement | null = start;
  while (el) {
    if (isScrollableY(el)) return el;
    el = el.parentElement;
  }
  return null;
};

export const usePullToRefresh = ({
  onRefresh,
  containerRef,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  const startY = useRef(0);
  const pullingRef = useRef(false);
  const activeScrollElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const getDocScrollEl = () =>
    (document.scrollingElement as HTMLElement | null) || document.documentElement;

  const getActiveScrollEl = useCallback((touchTarget: EventTarget | null) => {
    // 1) If user provided a containerRef and it's actually scrollable, use it.
    const provided = containerRef?.current;
    if (provided && isScrollableY(provided)) return provided;

    // 2) Otherwise, infer from touch target.
    const targetEl = (touchTarget as HTMLElement | null) ?? null;
    const inferred = findScrollableParent(targetEl);
    if (inferred) return inferred;

    // 3) Fallback to document scroll.
    return getDocScrollEl();
  }, [containerRef]);

  const reset = useCallback(() => {
    pullingRef.current = false;
    activeScrollElRef.current = null;
    startY.current = 0;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;

      const scrollEl = getActiveScrollEl(e.target);
      activeScrollElRef.current = scrollEl;

      // Only start when user is truly at the top of the active scroll container.
      if (scrollEl.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        pullingRef.current = true;
      } else {
        reset();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || isRefreshing) return;

      const scrollEl = activeScrollElRef.current ?? getActiveScrollEl(e.target);
      activeScrollElRef.current = scrollEl;

      // If user is no longer at top, abort immediately.
      if (scrollEl.scrollTop > 0) {
        reset();
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      // Do not interfere with normal scrolling (swipe up).
      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      // Resistance for a professional feel.
      const resistance = 0.4;
      const distance = Math.min(deltaY * resistance, 120);

      // Only prevent default when we are actually pulling down meaningfully.
      if (distance > 10) e.preventDefault();

      setPullDistance(distance);
    };

    const handleTouchEnd = async () => {
      if (!pullingRef.current || isRefreshing) {
        reset();
        return;
      }

      const distance = pullDistance;

      if (distance >= threshold) {
        setIsRefreshing(true);
        setPullDistance(50); // keep indicator visible

        try {
          await onRefreshRef.current();
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 800);
        } catch (err) {
          console.error('Pull-to-refresh failed:', err);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          reset();
        }
      } else {
        setPullDistance(0);
        reset();
      }
    };

    // Attach to document so we still capture events even if the inferred container changes.
    document.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    document.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd as EventListener, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart as EventListener);
      document.removeEventListener('touchmove', handleTouchMove as EventListener);
      document.removeEventListener('touchend', handleTouchEnd as EventListener);
      document.removeEventListener('touchcancel', handleTouchEnd as EventListener);
    };
  }, [disabled, getActiveScrollEl, isRefreshing, pullDistance, reset, threshold]);

  const progress = Math.min(pullDistance / threshold, 1);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setPullDistance(50);

    try {
      await onRefreshRef.current();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 800);
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      reset();
    }
  }, [isRefreshing, reset]);

  return {
    isRefreshing,
    pullDistance,
    progress,
    showSuccess,
    refresh,
  };
};
