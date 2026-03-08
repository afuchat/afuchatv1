import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Only scroll to top for new navigations, not for POP (back/forward)
    if (navType !== "POP") {
      // Try scrolling the TG page scroll container first, then window
      const tgScroller = document.querySelector('.tg-page-scroll, .flex-1.min-h-0.overflow-y-auto');
      if (tgScroller) {
        tgScroller.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname, navType]);

  return null;
};
