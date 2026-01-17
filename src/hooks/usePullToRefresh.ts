import { useState, useRef, useEffect, useCallback, RefObject } from 'react';
import { toast } from 'sonner';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  containerRef?: RefObject<HTMLElement>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  minPullToActivate?: number;
  scrollThreshold?: number; // How close to top before pull activates
}

export const usePullToRefresh = ({
  onRefresh,
  containerRef,
  threshold = 120, // Increased threshold for more deliberate pull
  maxPull = 160,
  disabled = false,
  minPullToActivate = 40, // Increased minimum pull distance
  scrollThreshold = 0, // Must be exactly at top
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const startY = useRef(0);
  const startX = useRef(0);
  const currentPullDistance = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const rafId = useRef<number>();
  const isHorizontalScrollRef = useRef(false);
  const hasDecidedDirectionRef = useRef(false);
  const touchStartScrollTop = useRef(0); // Track scroll position at touch start
  const isValidPullRef = useRef(false); // Track if this is a valid pull gesture

  // Keep ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Smooth spring animation for releasing
  const animatePullBack = useCallback(() => {
    const animate = () => {
      const current = currentPullDistance.current;
      if (current <= 0.5) {
        currentPullDistance.current = 0;
        setPullDistance(0);
        return;
      }
      
      // Faster spring back for snappier feel
      const springForce = current * 0.25;
      currentPullDistance.current = current - springForce;
      setPullDistance(Math.max(0, currentPullDistance.current));
      
      rafId.current = requestAnimationFrame(animate);
    };
    
    rafId.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const getScrollTop = () => {
      if (containerRef?.current) {
        return containerRef.current.scrollTop;
      }
      return window.scrollY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = getScrollTop();
      touchStartScrollTop.current = scrollTop;
      
      // Only allow pull if exactly at top (within scrollThreshold) and not refreshing
      if (scrollTop <= scrollThreshold && !isRefreshingRef.current) {
        startY.current = e.touches[0].pageY;
        startX.current = e.touches[0].pageX;
        isPullingRef.current = true;
        isHorizontalScrollRef.current = false;
        hasDecidedDirectionRef.current = false;
        isValidPullRef.current = false; // Reset valid pull flag
        
        // Cancel any existing animation
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      } else {
        // Not at top, don't allow pull
        isPullingRef.current = false;
        isValidPullRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const currentScrollTop = getScrollTop();
      const currentY = e.touches[0].pageY;
      const currentX = e.touches[0].pageX;
      const deltaY = currentY - startY.current;
      const deltaX = currentX - startX.current;
      
      // If user scrolled down since touch start, cancel pull
      if (currentScrollTop > scrollThreshold) {
        isPullingRef.current = false;
        isValidPullRef.current = false;
        if (currentPullDistance.current > 0) {
          animatePullBack();
        }
        return;
      }
      
      // Determine scroll direction on first significant movement (increased threshold)
      if (!hasDecidedDirectionRef.current && (Math.abs(deltaY) > 15 || Math.abs(deltaX) > 15)) {
        hasDecidedDirectionRef.current = true;
        
        // Stricter horizontal detection - any horizontal bias cancels pull
        if (Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
          isHorizontalScrollRef.current = true;
          isPullingRef.current = false;
          isValidPullRef.current = false;
          return;
        }
        
        // Must be clearly pulling down to be valid
        if (deltaY < minPullToActivate * 0.5) {
          isPullingRef.current = false;
          isValidPullRef.current = false;
          return;
        }
        
        isValidPullRef.current = true;
      }
      
      // Skip if determined to be horizontal scroll or not valid
      if (isHorizontalScrollRef.current || !isValidPullRef.current) return;
      
      // Only proceed if pulling down significantly and still at top
      if (deltaY <= minPullToActivate) {
        return;
      }
      
      // Apply stronger resistance curve for very deliberate pull feel
      const rawDistance = deltaY - minPullToActivate;
      const resistance = 0.7; // Higher resistance = much harder to pull
      const resistedDistance = Math.pow(Math.max(0, rawDistance), 1 - resistance * 0.5) * 1.2;
      
      const distance = Math.min(Math.max(0, resistedDistance), maxPull);

      if (distance > 0) {
        e.preventDefault();
        currentPullDistance.current = distance;
        
        // Use RAF for smooth updates
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
        rafId.current = requestAnimationFrame(() => {
          setPullDistance(currentPullDistance.current);
        });
      }
    };

    const handleTouchEnd = async () => {
      const wasValidPull = isValidPullRef.current;
      const distance = currentPullDistance.current;
      
      // Reset all flags
      isPullingRef.current = false;
      isHorizontalScrollRef.current = false;
      hasDecidedDirectionRef.current = false;
      isValidPullRef.current = false;

      // Only trigger refresh if it was a valid pull gesture
      if (wasValidPull && distance >= threshold && !isRefreshingRef.current) {
        // Trigger refresh
        setIsRefreshing(true);
        isRefreshingRef.current = true;
        
        // Keep indicator visible during refresh
        currentPullDistance.current = 50;
        setPullDistance(50);
        
        try {
          await onRefreshRef.current();
          
          // Show success state
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
          }, 600);
          
        } catch (error) {
          console.error('Pull to refresh error:', error);
          toast.error('Failed to refresh');
        } finally {
          setIsRefreshing(false);
          isRefreshingRef.current = false;
          
          // Animate back to 0
          currentPullDistance.current = 50;
          animatePullBack();
        }
      } else if (distance > 0) {
        // Didn't reach threshold or wasn't valid, spring back
        animatePullBack();
      }
      
      startY.current = 0;
      startX.current = 0;
    };

    // Use container element if provided, otherwise use document
    const target = containerRef?.current || document;
    const options: AddEventListenerOptions = { passive: false };
    
    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    target.addEventListener('touchmove', handleTouchMove as EventListener, options);
    target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    target.addEventListener('touchcancel', handleTouchEnd as EventListener, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart as EventListener);
      target.removeEventListener('touchmove', handleTouchMove as EventListener);
      target.removeEventListener('touchend', handleTouchEnd as EventListener);
      target.removeEventListener('touchcancel', handleTouchEnd as EventListener);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [disabled, maxPull, threshold, minPullToActivate, scrollThreshold, animatePullBack, containerRef]);

  const progress = Math.min(pullDistance / threshold, 1);

  // Manual refresh trigger
  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    setIsRefreshing(true);
    isRefreshingRef.current = true;
    setPullDistance(50);
    
    try {
      await onRefreshRef.current();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 600);
    } catch (error) {
      console.error('Manual refresh error:', error);
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
      animatePullBack();
    }
  }, [animatePullBack]);

  return {
    isPulling: isPullingRef.current,
    isRefreshing,
    pullDistance,
    progress,
    showSuccess,
    refresh,
  };
};
