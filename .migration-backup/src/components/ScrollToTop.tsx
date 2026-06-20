import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== "POP") {
      // Scroll the nearest scrollable container to top
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      
      // Also reset #root if it's a scroll container (Telegram)
      const root = document.getElementById('root');
      if (root && root.scrollTop > 0) {
        root.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      }
      
      // Also reset any .flex-1.overflow-y-auto containers (Layout sub-pages in TMA)
      document.querySelectorAll('.overflow-y-auto').forEach((el) => {
        if (el.scrollTop > 0) {
          el.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }
      });
    }
  }, [pathname, navType]);

  return null;
};
