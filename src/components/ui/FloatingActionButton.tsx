import { useState, useEffect } from 'react';
import { Feather, X, Send, FileEdit, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FabAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  wallPostAction?: {
    targetName: string;
    onClick: () => void;
  };
  profileActions?: {
    userId: string;
    userName: string;
    onMessage?: () => void;
  };
}

const FloatingActionButton = ({ wallPostAction, profileActions }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on a profile page (not home/feed)
  const isProfilePage = profileActions !== undefined;

  // Close FAB when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle scroll to hide/show FAB
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsScrollingDown(true);
      } else {
        setIsScrollingDown(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleActionClick = (action: () => void) => {
    setIsOpen(false);
    setTimeout(action, 50);
  };

  const handleNewPost = () => {
    if (location.pathname === '/' || location.pathname === '/home') {
      window.dispatchEvent(new Event('open-new-post'));
    } else {
      navigate('/home');
      setTimeout(() => {
        window.dispatchEvent(new Event('open-new-post'));
      }, 300);
    }
  };

  // Profile-specific actions (when viewing another user's profile)
  const profilePageActions: FabAction[] = profileActions ? [
    ...(wallPostAction ? [{
      icon: <FileEdit className="h-6 w-6" strokeWidth={2.5} />,
      label: `Post on ${wallPostAction.targetName}'s wall`,
      onClick: () => handleActionClick(wallPostAction.onClick),
    }] : []),
    {
      icon: <Send className="h-6 w-6" strokeWidth={2.5} />,
      label: `Transfer to ${profileActions.userName}`,
      onClick: () => handleActionClick(() => navigate(`/transfer?to=${profileActions.userId}`)),
    },
    ...(profileActions.onMessage ? [{
      icon: <MessageSquare className="h-6 w-6" strokeWidth={2.5} />,
      label: `Message ${profileActions.userName}`,
      onClick: () => handleActionClick(profileActions.onMessage!),
    }] : []),
  ] : [];

  // Default actions for other pages (home, feed, etc.)
  const defaultActions: FabAction[] = [
    {
      icon: <Feather className="h-6 w-6" strokeWidth={2.5} />,
      label: 'Post',
      onClick: () => handleActionClick(handleNewPost),
    },
    {
      icon: <Send className="h-6 w-6" strokeWidth={2.5} />,
      label: 'Transfer',
      onClick: () => handleActionClick(() => navigate('/transfer')),
    },
  ];

  const actions = isProfilePage ? profilePageActions : defaultActions;

  // Don't render if no actions available
  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className={cn(
        "fixed bottom-20 right-4 z-50 transition-all duration-300",
        isScrollingDown ? "translate-y-32 opacity-0" : "translate-y-0 opacity-100"
      )}>
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* Main FAB Button - X style */
            <motion.button
              key="fab-closed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileTap={{ scale: 0.95 }}
              className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center"
              onClick={() => setIsOpen(true)}
            >
              <Feather className="h-7 w-7" strokeWidth={2.5} />
            </motion.button>
          ) : (
            /* Action Menu */
            <motion.div
              key="fab-open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-end gap-3"
            >
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    y: 0,
                    transition: { delay: index * 0.05 }
                  }}
                  exit={{ opacity: 0, x: 20 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action.onClick}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm font-semibold text-foreground bg-card px-4 py-2 rounded-full shadow-lg border border-border/40 max-w-[200px] truncate">
                    {action.label}
                  </span>
                  <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 flex items-center justify-center flex-shrink-0">
                    {action.icon}
                  </div>
                </motion.button>
              ))}
              
              {/* Close button */}
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                className="h-16 w-16 rounded-full bg-muted text-muted-foreground shadow-xl flex items-center justify-center mt-2"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-7 w-7" strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default FloatingActionButton;
