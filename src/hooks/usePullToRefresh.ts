import { useState, useRef, useEffect, useCallback, RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  containerRef?: RefObject<HTMLElement>;
  threshold?: number;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  containerRef,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const startY = useRef(0);
  const isPulling = useRef(false);
  const isAtTop = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const getScrollTop = useCallback(() => {
    if (containerRef?.current) {
      return containerRef.current.scrollTop;
    }
    return window.scrollY || document.documentElement.scrollTop;
  }, [containerRef]);

  const resetPull = useCallback(() => {
    isPulling.current = false;
    isAtTop.current = false;
    startY.current = 0;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if at top of scroll
      const scrollTop = getScrollTop();
      if (scrollTop <= 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        isAtTop.current = true;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || !isAtTop.current || isRefreshing) return;
      
      // Check if still at top
      const scrollTop = getScrollTop();
      if (scrollTop > 0) {
        resetPull();
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      // Only pull down, not up
      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      // Apply resistance for natural feel
      const resistance = 0.4;
      const distance = Math.min(deltaY * resistance, 120);
      
      if (distance > 10) {
        e.preventDefault();
      }
      
      setPullDistance(distance);
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) {
        resetPull();
        return;
      }

      const distance = pullDistance;
      
      if (distance >= threshold) {
        // Trigger refresh
        setIsRefreshing(true);
        setPullDistance(50); // Keep indicator visible
        
        try {
          await onRefreshRef.current();
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 800);
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Animate back to 0
        setPullDistance(0);
      }
      
      isPulling.current = false;
      isAtTop.current = false;
      startY.current = 0;
    };

    const target = containerRef?.current || document;
    
    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    target.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    target.addEventListener('touchcancel', handleTouchEnd as EventListener, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart as EventListener);
      target.removeEventListener('touchmove', handleTouchMove as EventListener);
      target.removeEventListener('touchend', handleTouchEnd as EventListener);
      target.removeEventListener('touchcancel', handleTouchEnd as EventListener);
    };
  }, [disabled, threshold, isRefreshing, pullDistance, getScrollTop, resetPull, containerRef]);

  const progress = Math.min(pullDistance / threshold, 1);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setPullDistance(50);
    
    try {
      await onRefreshRef.current();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 800);
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing]);

  return {
    isRefreshing,
    pullDistance,
    progress,
    showSuccess,
    refresh,
  };
};
