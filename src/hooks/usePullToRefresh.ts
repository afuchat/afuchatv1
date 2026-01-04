import { useState, useRef, useEffect, useCallback, RefObject } from 'react';
import { toast } from 'sonner';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  containerRef?: RefObject<HTMLElement>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  minPullToActivate?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  containerRef,
  threshold = 100,
  maxPull = 160,
  disabled = false,
  minPullToActivate = 20,
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
      // Only trigger if at very top and not refreshing
      if (getScrollTop() <= 2 && !isRefreshingRef.current) {
        startY.current = e.touches[0].pageY;
        startX.current = e.touches[0].pageX;
        isPullingRef.current = true;
        isHorizontalScrollRef.current = false;
        hasDecidedDirectionRef.current = false;
        
        // Cancel any existing animation
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const currentY = e.touches[0].pageY;
      const currentX = e.touches[0].pageX;
      const deltaY = currentY - startY.current;
      const deltaX = currentX - startX.current;
      
      // Determine scroll direction on first significant movement
      if (!hasDecidedDirectionRef.current && (Math.abs(deltaY) > 10 || Math.abs(deltaX) > 10)) {
        hasDecidedDirectionRef.current = true;
        // If horizontal movement is greater, it's a horizontal scroll (e.g., product carousel)
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          isHorizontalScrollRef.current = true;
          isPullingRef.current = false;
          return;
        }
      }
      
      // Skip if determined to be horizontal scroll
      if (isHorizontalScrollRef.current) return;
      
      // Only proceed if pulling down and at top
      if (deltaY <= minPullToActivate || getScrollTop() > 2) {
        return;
      }
      
      // Apply strong resistance curve for deliberate pull feel
      const rawDistance = deltaY - minPullToActivate;
      const resistance = 0.6; // Higher resistance = harder to pull
      const resistedDistance = Math.pow(Math.max(0, rawDistance), 1 - resistance * 0.4) * 1.5;
      
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
      if (!isPullingRef.current && !currentPullDistance.current) return;

      const distance = currentPullDistance.current;
      isPullingRef.current = false;
      isHorizontalScrollRef.current = false;
      hasDecidedDirectionRef.current = false;

      if (distance >= threshold && !isRefreshingRef.current) {
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
      } else {
        // Didn't reach threshold, spring back
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
  }, [disabled, maxPull, threshold, minPullToActivate, animatePullBack, containerRef]);

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
