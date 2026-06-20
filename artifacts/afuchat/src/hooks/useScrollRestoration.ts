import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollPosition {
  x: number;
  y: number;
}

const scrollPositions = new Map<string, ScrollPosition>();

export const useScrollRestoration = () => {
  const location = useLocation();
  const previousPath = useRef<string>(location.pathname);

  useEffect(() => {
    // Save scroll position before navigating away
    const saveScrollPosition = () => {
      scrollPositions.set(previousPath.current, {
        x: window.scrollX,
        y: window.scrollY,
      });
    };

    // Restore scroll position when navigating back
    const restoreScrollPosition = () => {
      const savedPosition = scrollPositions.get(location.pathname);
      
      if (savedPosition) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo({
            left: savedPosition.x,
            top: savedPosition.y,
            behavior: 'instant' as ScrollBehavior,
          });
        });
      } else {
        // New page, scroll to top
        window.scrollTo(0, 0);
      }
    };

    // Save current position before path changes
    if (previousPath.current !== location.pathname) {
      saveScrollPosition();
      previousPath.current = location.pathname;
    }

    // Restore position for current path
    restoreScrollPosition();

    // Save position on page unload
    return () => {
      saveScrollPosition();
    };
  }, [location.pathname]);
};
