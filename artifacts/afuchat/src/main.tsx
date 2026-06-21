import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

const hideLoader = () => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 300);
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Hide the HTML spinner only after React has painted the first frame.
// Double-rAF is the standard React 18 pattern — the first rAF queues work
// inside React's scheduler, the second fires after the browser actually paints.
requestAnimationFrame(() => {
  requestAnimationFrame(hideLoader);
});

// Hard fallback: if rAF never fires (e.g., tab in background), clear after 3 s.
setTimeout(hideLoader, 3000);
