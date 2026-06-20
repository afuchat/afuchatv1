import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Minus, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DesktopPageWindowProps {
  children: ReactNode;
  title?: string;
  className?: string;
  maxWidth?: string;
}

// Routes that render as the base layer (not windowed)
const BASE_ROUTES = ['/', '/home', '/feed', '/search', '/chats', '/chat/', '/shorts', '/notifications'];

export const isBaseRoute = (pathname: string) => {
  return BASE_ROUTES.some(route => {
    if (route.endsWith('/')) return pathname.startsWith(route);
    return pathname === route;
  });
};

// Get a human-readable title from a pathname
const getTitleFromPath = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  const last = segments[segments.length - 1];
  return last
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const DesktopPageWindow = ({ children, title, className, maxWidth = 'max-w-4xl' }: DesktopPageWindowProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const windowTitle = title || getTitleFromPath(location.pathname);

  const handleClose = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "w-full mx-auto rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col",
        "my-4",
        maxWidth,
        className
      )}
      style={{ maxHeight: 'calc(100vh - 6rem)' }}
    >
      {/* Window Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border flex-shrink-0">
        {/* Traffic light buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClose}
            className="h-3 w-3 rounded-full bg-destructive/80 hover:bg-destructive transition-colors flex items-center justify-center group"
            title="Close"
          >
            <X className="h-2 w-2 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={handleClose}
            className="h-3 w-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors flex items-center justify-center group"
            title="Minimize"
          >
            <Minus className="h-2 w-2 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>

        {/* Title */}
        <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">
          {windowTitle}
        </span>

        {/* Spacer */}
        <div className="w-[52px]" />
      </div>

      {/* Window Content */}
      <ScrollArea className="flex-1">
        <div>
          {children}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default DesktopPageWindow;
