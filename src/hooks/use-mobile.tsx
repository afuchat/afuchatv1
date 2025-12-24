import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      // Check viewport width
      const viewportIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      
      // Also check for touch capability and mobile user agents as a fallback
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // If viewport is mobile OR (has touch and mobile UA), treat as mobile
      return viewportIsMobile || (hasTouchScreen && mobileUserAgent);
    }
    return true; // Default to mobile for SSR
  });

  React.useEffect(() => {
    const checkMobile = () => {
      const viewportIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Same logic as initial state
      setIsMobile(viewportIsMobile || (hasTouchScreen && mobileUserAgent));
    };
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", checkMobile);
    checkMobile();
    
    return () => mql.removeEventListener("change", checkMobile);
  }, []);

  return isMobile;
}
