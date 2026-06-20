import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, RotateCw, X, ExternalLink,
  Shield, Lock, MoreVertical, Share2, Copy, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InAppBrowserProps {
  url: string;
  title?: string;
  onClose: () => void;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return ''; }
}

export const InAppBrowser = ({ url, title, onClose }: InAppBrowserProps) => {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isSecure = currentUrl.startsWith('https');

  useEffect(() => {
    // Simulate loading progress
    if (loading) {
      setProgress(0);
      const t1 = setTimeout(() => setProgress(30), 100);
      const t2 = setTimeout(() => setProgress(60), 400);
      const t3 = setTimeout(() => setProgress(85), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleOpenExternal = () => {
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      toast.success('Link copied');
    });
    setShowMenu(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || getDomain(currentUrl), url: currentUrl });
      } catch { /* cancelled */ }
    } else {
      handleCopyLink();
    }
    setShowMenu(false);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[9999] bg-background flex flex-col"
      style={{
        paddingTop: 'max(0px, var(--tg-safe-top, 0px))',
        paddingBottom: 'max(0px, var(--tg-safe-bottom, 0px))',
      }}
    >
      {/* Top Bar - Chrome-like */}
      <div className="flex-shrink-0 bg-card border-b border-border">
        {/* Navigation row */}
        <div className="flex items-center gap-1 px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onClose}
          >
            <X className="h-4.5 w-4.5" />
          </Button>

          {/* URL bar */}
          <div className="flex-1 mx-1 flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1.5 min-w-0">
            {isSecure ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <img
                src={getFaviconUrl(currentUrl)}
                alt=""
                className="h-4 w-4 rounded-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <span className="text-[13px] text-foreground truncate font-medium">
                {getDomain(currentUrl)}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleRefresh}
          >
            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-20 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-foreground hover:bg-muted/60 transition-colors"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      Share
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-foreground hover:bg-muted/60 transition-colors"
                      onClick={handleCopyLink}
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                      Copy link
                    </button>
                    <div className="h-px bg-border" />
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-foreground hover:bg-muted/60 transition-colors"
                      onClick={() => { handleOpenExternal(); setShowMenu(false); }}
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      Open in browser
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Loading progress bar */}
        {progress > 0 && progress < 100 && (
          <div className="h-[2px] bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Page title bar */}
      {title && (
        <div className="flex-shrink-0 px-4 py-2 bg-card/80 border-b border-border/50">
          <p className="text-[12px] text-muted-foreground truncate">{title}</p>
        </div>
      )}

      {/* Iframe content */}
      <div className="flex-1 relative bg-background overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                <img
                  src={getFaviconUrl(currentUrl)}
                  alt=""
                  className="h-6 w-6 rounded"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </div>
              <p className="text-[12px] text-muted-foreground">Loading {getDomain(currentUrl)}...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          title={title || 'Web page'}
        />
      </div>

      {/* Bottom bar with domain */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-card border-t border-border">
        <div className="flex items-center gap-1.5">
          {isSecure && <Lock className="h-3 w-3 text-green-500" />}
          <span className="text-[11px] text-muted-foreground">{getDomain(currentUrl)}</span>
        </div>
        <button
          onClick={onClose}
          className="text-[12px] text-primary font-medium"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
};
