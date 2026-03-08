import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== "POP") {
      // In Telegram, #root is the scroll container
      const root = document.getElementById('root');
      if (root && root.scrollTop > 0) {
        root.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname, navType]);

  return null;
};
