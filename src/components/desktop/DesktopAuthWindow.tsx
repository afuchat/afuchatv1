import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DesktopAuthWindowProps {
  children: ReactNode;
}

/**
 * Wraps auth page content in a centered modal window on desktop.
 * On mobile, renders children directly (full page).
 */
const DesktopAuthWindow = ({ children }: DesktopAuthWindowProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (isMobile) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-md flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              className="h-3 w-3 rounded-full bg-destructive/80 hover:bg-destructive transition-colors flex items-center justify-center group"
            >
              <X className="h-2 w-2 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">AfuChat</span>
          <div className="w-[52px]" />
        </div>

        {/* Auth Content - override full-screen styles */}
        <div className="max-h-[80vh] overflow-y-auto [&>div]:min-h-0 [&>div]:relative [&>div]:overflow-visible">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default DesktopAuthWindow;
